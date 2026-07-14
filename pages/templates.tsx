import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ChangeEvent, useEffect, useState } from 'react';
import { inferTemplateLanguage } from '@/utils/languages';

interface Tag {
  id: number;
  name: string;
}

interface Template {
  id: number;
  title: string;
  explanation: string;
  tags: Tag[];
  code: string;
  language?: string | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      token: context.req.cookies.token || null,
    },
  };
};

const TemplatesPage = ({ token }: { token: string | null }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const pageSize = 12;

  useEffect(() => {
    setIsLoggedIn(Boolean(token));
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const fetchTemplates = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(
            `/api/templates/visitor_get?page=${currentPage}&limit=${pageSize}&search=${encodeURIComponent(searchQuery)}`,
            { signal: controller.signal }
          );
          if (!response.ok) throw new Error('Failed to fetch templates');

          const data = await response.json();
          setTemplates(data.templates || []);
          setTotalPages(Math.max(Math.ceil((data.totalCount || 0) / pageSize), 1));
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            setError(error.message);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };

      fetchTemplates();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleEditClick = (templateId: number) => {
    if (!isLoggedIn) {
      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        router.push(`/codespace?templateId=${templateId}`);
      }, 1500);
    } else {
      router.push(`/codespace?templateId=${templateId}`);
    }
  };

  return (
    <div className="app-page">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Reusable code</p>
          <h1 className="mt-2 text-4xl font-black text-white">Code Templates</h1>
          <p className="mt-2 text-slate-300">Search, open, run, and adapt saved examples.</p>
        </div>
        <button onClick={() => router.push('/codespace')} className="btn-primary">
          New Template
        </button>
      </div>

      <div className="app-card mb-5 p-4">
        <input
          type="text"
          placeholder="Search by title, explanation, or tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="form-input"
        />
      </div>

      {error ? (
        <div className="alert-error">{error}</div>
      ) : loading ? (
        <div className="app-card p-8 text-center text-slate-300">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="app-card p-8 text-center text-slate-300">No templates found.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="app-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-white">{template.title}</h2>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
                  #{template.id}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 min-h-16 text-sm leading-6 text-slate-300">
                {template.explanation || 'No explanation provided.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="tag-pill uppercase">{inferTemplateLanguage(template)}</span>
                {template.tags.map((tag) => (
                  <span key={tag.id} className="tag-pill">
                    {tag.name}
                  </span>
                ))}
              </div>
              <button onClick={() => handleEditClick(template.id)} className="btn-primary mt-5 w-full">
                Open
              </button>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          >
            Next
          </button>
        </div>
      )}

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="app-card p-6 text-center">
            <p className="font-semibold text-white">Opening this as a forkable version.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;

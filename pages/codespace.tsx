import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {
  inferTemplateLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '@/utils/languages';

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      token: context.req.cookies.token || null,
    },
  };
};

interface CodeEditorProps {
  token: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ token }) => {
  const router = useRouter();
  const { code: queryCode, language: queryLanguage, templateId } = router.query;

  const [code, setCode] = useState<string>('# Write your code here');
  const [output, setOutput] = useState<string>('');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [stdin, setStdin] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSavePopup, setShowSavePopup] = useState<boolean>(false);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateExplanation, setTemplateExplanation] = useState<string>('');
  const [templateTags, setTemplateTags] = useState<string>('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const loadTemplate = async () => {
      if (typeof templateId === 'string') {
        const parsedId = Number(templateId);
        if (!Number.isInteger(parsedId)) {
          setTemplateError('This template link is invalid.');
          return;
        }

        setTemplateLoading(true);
        setTemplateError('');
        try {
          const response = await fetch(`/api/templates/${parsedId}`);
          if (!response.ok) throw new Error('Template not found');
          const template = await response.json();
          setCode(template.code);
          setLanguage(inferTemplateLanguage(template));
          setTemplateTitle(`${template.title} Copy`);
          setTemplateExplanation(template.explanation || '');
          setTemplateTags(template.tags?.map((tag: { name: string }) => tag.name).join(', ') || '');
          return;
        } catch (error) {
          setTemplateError(error instanceof Error ? error.message : 'Failed to load template');
        } finally {
          setTemplateLoading(false);
        }
      }

      if (typeof queryCode === 'string') {
        setCode(queryCode);
      }
      if (typeof queryLanguage === 'string') {
        setLanguage(inferTemplateLanguage({ language: queryLanguage }));
      }
    };

    loadTemplate();
  }, [queryCode, queryLanguage, router.isReady, templateId]);

  const runCode = async () => {
    setIsLoading(true);
    setOutput('');

    try {
      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          code,
          stdin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.output || 'No output');
      } else {
        setOutput(`Error: ${data.error || data.message || 'Execution failed'}`);
      }
    } catch (error: any) {
      setOutput(`Network Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!token) {
      alert('Please log in to save templates.');
      return;
    }

    const tagsArray = templateTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const templateData = {
      title: templateTitle,
      explanation: templateExplanation,
      tags: tagsArray,
      code,
      language,
    };

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        alert('Template saved successfully!');
        setShowSavePopup(false);
      } else {
        const errorData = await response.json().catch(() => null);
        alert(`Failed to save template: ${errorData?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const isDark = theme === 'dark';
  const pageClass = isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-100 text-slate-950';
  const panelClass = isDark
    ? 'border-slate-700/80 bg-slate-900/90 shadow-black/20'
    : 'border-slate-200 bg-white shadow-slate-200/70';
  const inputClass = isDark
    ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20'
    : 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20';
  const editorClass = isDark
    ? 'border-slate-700 bg-[#111827] text-slate-100 shadow-inner shadow-black/20 focus:border-blue-400 focus:ring-blue-400/20'
    : 'border-slate-300 bg-slate-50 text-slate-950 shadow-inner shadow-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20';
  const outputClass = isDark
    ? 'border-slate-800 bg-[#020617] text-emerald-300'
    : 'border-slate-200 bg-slate-950 text-emerald-300';
  const secondaryButtonClass = isDark
    ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50';

  return (
    <div className={`-mx-4 min-h-[calc(100vh-64px)] px-4 py-5 ${pageClass}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:h-[calc(100vh-104px)] lg:flex-row lg:overflow-hidden lg:gap-5">
        <section className={`flex min-h-[620px] min-w-0 flex-[2] flex-col rounded-lg border p-4 shadow-xl lg:min-h-0 ${panelClass}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <select
              value={language}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value as SupportedLanguage)}
              className={`h-10 min-w-32 rounded-md border px-3 text-sm font-semibold uppercase outline-none ring-0 transition focus:ring-4 ${inputClass}`}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${secondaryButtonClass}`}
              >
                {isDark ? 'Light' : 'Dark'}
              </button>

              <button
                onClick={() => setShowSavePopup(true)}
                className="h-10 rounded-md bg-slate-100 px-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-white"
              >
                Save Template
              </button>
            </div>
          </div>

          {templateLoading && (
            <div className="mb-3 rounded-md border border-blue-400/30 bg-blue-950/40 px-3 py-2 text-sm text-blue-100">
              Loading template...
            </div>
          )}
          {templateError && (
            <div className="mb-3 rounded-md border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {templateError}
            </div>
          )}

          <textarea
            value={code}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCode(e.target.value)}
            className={`min-h-0 flex-1 resize-none rounded-md border p-4 font-mono text-sm leading-6 outline-none ring-0 transition focus:ring-4 ${editorClass}`}
            spellCheck={false}
            placeholder="Write your code here..."
          />

          <input
            type="text"
            value={stdin}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStdin(e.target.value)}
            placeholder="Standard Input (optional)"
            className={`mt-3 h-11 rounded-md border px-3 text-sm outline-none ring-0 transition focus:ring-4 ${inputClass}`}
          />

          <button
            onClick={runCode}
            disabled={isLoading}
            className="mt-3 h-11 w-full rounded-md bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:shadow-none"
          >
            {isLoading ? 'Running...' : 'Run Code'}
          </button>
        </section>

        <aside className={`flex min-h-72 min-w-0 flex-1 flex-col rounded-lg border p-4 shadow-xl lg:min-w-[240px] ${panelClass}`}>
          <div className="mb-4 flex h-10 items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide">Output</h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isLoading ? 'Running' : 'Ready'}
            </span>
          </div>
          <pre className={`min-h-0 flex-1 whitespace-pre-wrap break-words rounded-md border p-4 font-mono text-sm leading-6 ${outputClass}`}>
{output || 'Output will be displayed here...'}
          </pre>
        </aside>
      </div>

      {showSavePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-lg border p-6 shadow-2xl ${panelClass}`}>
            <h2 className="mb-4 text-xl font-bold">Save Template</h2>
            <input
              type="text"
              placeholder="Title"
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              className={`mb-3 h-11 w-full rounded-md border px-3 text-sm outline-none ring-0 transition focus:ring-4 ${inputClass}`}
            />
            <textarea
              placeholder="Explanation"
              value={templateExplanation}
              onChange={(e) => setTemplateExplanation(e.target.value)}
              className={`mb-3 min-h-28 w-full resize-none rounded-md border px-3 py-2 text-sm outline-none ring-0 transition focus:ring-4 ${inputClass}`}
            />
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={templateTags}
              onChange={(e) => setTemplateTags(e.target.value)}
              className={`mb-5 h-11 w-full rounded-md border px-3 text-sm outline-none ring-0 transition focus:ring-4 ${inputClass}`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSavePopup(false)}
                className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${secondaryButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="h-10 rounded-md bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;

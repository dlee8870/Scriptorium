import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import prisma from '@/utils/db';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/utils/serverEnv';

// Type definitions for reported posts and comments
interface Report {
  reason: string;
  createdAt: string;
}

interface ReportedPost {
  id: number;
  title: string;
  description: string;
  reports: Report[];
}

interface ReportedComment {
  id: number;
  content: string;
  reports: Report[];
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
  const cookies = req.cookies;
  const token = cookies.token || null;

  if (!token) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const SECRET_KEY = getJwtSecret();

    // Decode token and extract userId
    const decodedToken = jwt.verify(token, SECRET_KEY) as { userId: number };

    if (!decodedToken.userId) {
      console.error('Decoded token does not contain userId');
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    // Fetch the user's role using userId
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return {
        redirect: {
          destination: '/unauthorized',
          permanent: false,
        },
      };
    }

    return {
      props: {
        token,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Error validating token or fetching user role:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
};

export default function ReportsPage({ token, role }: { token: string; role: string }) {
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [reportedComments, setReportedComments] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (role !== 'ADMIN') {
      setError('You are unauthorized to view this page.');
      return;
    }

    const fetchReports = async () => {
      try {
        if (!token) {
          setError('Authorization token not found. Please log in as an admin.');
          return;
        }

        const res = await fetch('/api/reports', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.trim()}`,
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('API Error:', errorText);
          throw new Error('Failed to fetch reported content');
        }

        const data = await res.json();

        setReportedPosts(data.reportedPosts || []);
        setReportedComments(data.reportedComments || []);
      } catch (err) {
        console.error('Error in fetchReports:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token, role]);

  const handleHideContent = async (id: number, type: 'post' | 'comment') => {
    try {
      const res = await fetch('/api/reports/hide', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(
          type === 'post' ? { blogPostId: id } : { commentId: id }
        ),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to hide content');
      }

      alert('Content hidden successfully');
      router.reload();
    } catch (error) {
      console.error('Error hiding content:', error);
      alert('Error hiding content');
    }
  };

  if (role !== 'ADMIN') {
    return (
      <div className="app-narrow-page">
        <p className="alert-error">
          You are unauthorized to view this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="app-narrow-page"><div className="app-card p-8 text-center text-slate-300">Loading reports...</div></div>;
  }

  if (error) {
    return (
      <div className="app-narrow-page">
        <p className="alert-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Moderation</p>
        <h1 className="mt-2 text-4xl font-black text-white">Reported Content</h1>
        <p className="mt-2 text-slate-300">Review reported posts and comments, then hide content when needed.</p>
      </div>

      <section className="app-card p-5">
        <h2 className="text-2xl font-bold text-white">Reported Blog Posts</h2>
        {reportedPosts.length === 0 ? (
          <p className="mt-4 text-slate-400">No reported posts</p>
        ) : (
          <ul className="space-y-4 mt-4">
            {reportedPosts.map((post) => (
              <li key={post.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-xl font-bold">{post.title}</h3>
                <p className="mt-2 text-slate-300">{post.description}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Reports: {post.reports.length}
                </p>
                <button
                  onClick={() => handleHideContent(post.id, 'post')}
                  className="btn-danger mt-3"
                >
                  Hide Post
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-card mt-5 p-5">
        <h2 className="text-2xl font-bold text-white">Reported Comments</h2>
        {reportedComments.length === 0 ? (
          <p className="mt-4 text-slate-400">No reported comments</p>
        ) : (
          <ul className="space-y-4 mt-4">
            {reportedComments.map((comment) => (
              <li key={comment.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-slate-200">{comment.content}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Reports: {comment.reports.length}
                </p>
                <button
                  onClick={() => handleHideContent(comment.id, 'comment')}
                  className="btn-danger mt-3"
                >
                  Hide Comment
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

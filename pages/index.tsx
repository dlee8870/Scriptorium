import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import jwt from 'jsonwebtoken';
import prisma from '@/utils/db';
import { getJwtSecret } from '@/utils/serverEnv';

interface LandingProps {
  firstname: string;
  lastname: string;
  token: string | null;
  role: string | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookies = context.req.cookies;
  const cookieToken = cookies.token || null;
  let token: string | null = null;
  let role: string | null = null;

  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, getJwtSecret()) as { userId: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true },
      });
      if (user) {
        token = cookieToken;
        role = user.role;
      }
    } catch {
      token = null;
    }
  }

  return {
    props: {
      firstname: cookies.firstname || 'User',
      lastname: cookies.lastname || '',
      token,
      role,
    },
  };
};

export default function LandingPage({ firstname, lastname, token, role }: LandingProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(token));
  }, [token]);

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST' });
      document.cookie = 'token=; Max-Age=0; path=/';
      document.cookie = 'firstname=; Max-Age=0; path=/';
      document.cookie = 'lastname=; Max-Age=0; path=/';
      setIsLoggedIn(false);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const features = [
    {
      title: 'Write and run code',
      body: 'Use the editor to test snippets with standard input and live output.',
    },
    {
      title: 'Save reusable templates',
      body: 'Organize examples with explanations and tags, then fork work from others.',
    },
    {
      title: 'Discuss ideas',
      body: 'Publish blog posts, link templates, comment, vote, and report content.',
    },
  ];

  return (
    <div className="app-page">
      <section className="grid items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-blue-300">
            CSC309 Scriptorium
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            Code, document, and share examples in one workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Scriptorium brings together a code runner, reusable templates, and discussion posts for
            learning from working examples.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isLoggedIn ? (
              <>
                <button onClick={() => router.push('/codespace')} className="btn-primary">
                  Open Codespace
                </button>
                <button onClick={() => router.push('/blogposts')} className="btn-secondary">
                  Browse Posts
                </button>
                <button onClick={handleLogout} className="btn-danger">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/codespace')} className="btn-primary">
                  Try Codespace
                </button>
                <button onClick={() => router.push('/login')} className="btn-secondary">
                  Login
                </button>
                <button onClick={() => router.push('/signup')} className="btn-danger">
                  Signup
                </button>
              </>
            )}
          </div>

          {isLoggedIn && (
            <p className="mt-5 text-sm text-slate-400">
              Signed in as {firstname} {lastname}
            </p>
          )}
        </div>

        <div className="app-card p-5">
          <div className="rounded-md border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-200">
            <div className="mb-3 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <pre className="whitespace-pre-wrap leading-7">
{`function shareExample(topic) {
  const template = run(topic.code);
  publish({ template, tags: topic.tags });
  return "ready to discuss";
}`}
            </pre>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="app-card p-5">
            <h2 className="text-lg font-bold text-white">{feature.title}</h2>
            <p className="mt-2 leading-6 text-slate-300">{feature.body}</p>
          </article>
        ))}
      </section>

      {isLoggedIn && role === 'ADMIN' && (
        <div className="mt-6">
          <button onClick={() => router.push('/admin/reports')} className="btn-secondary">
            Reports Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

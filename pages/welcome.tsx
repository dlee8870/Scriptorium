import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState({ firstname: 'User', lastname: '' });

  useEffect(() => {
    const getCookie = (cookieName: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${cookieName}=`);
      return parts.length === 2 ? decodeURIComponent(parts.pop()?.split(';').shift() || '') : '';
    };

    setName({
      firstname: getCookie('firstname') || 'User',
      lastname: getCookie('lastname'),
    });
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center py-10">
      <div className="app-card max-w-2xl p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Signed in</p>
        <h1 className="mt-2 text-3xl font-black text-white">
          Welcome to Scriptorium, {name.firstname} {name.lastname}!
        </h1>
        <p className="mt-3 text-slate-300">Pick up where you left off in the editor or browse the latest posts.</p>
        <button
          onClick={() => router.push('/')}
          className="btn-primary mt-6"
        >
          Start
        </button>
      </div>
    </div>
  );
}


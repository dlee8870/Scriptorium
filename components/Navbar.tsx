import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-950/90 px-6 py-4 shadow-lg shadow-black/20 backdrop-blur">
      <h1
        onClick={() => router.push('/')}
        className="inline-block cursor-pointer text-2xl font-black tracking-tight text-red-500 transition hover:text-white"
      >
        Scriptorium
      </h1>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => router.push('/settings')}
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          Settings
        </button>
        <button
          onClick={() => router.push('/blogposts')}
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          Blogposts
        </button>
        <button
          onClick={() => router.push('/codespace')}
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          Codespace
        </button>
        <button
          onClick={() => router.push('/templates')}
          className="rounded-md px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          Templates
        </button>
      </div>
    </nav>
  );
}



import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
      <div className="app-narrow-page">
        <div className="app-card p-8">
        <h1 className="text-4xl font-black text-red-400">Unauthorized</h1>
        <p className="mt-4 text-lg text-slate-300">
          You do not have permission to access this page.
        </p>
        <Link
          href="/"
          className="btn-primary mt-6"
        >
          Return to Home
        </Link>
        </div>
      </div>
    );
  }

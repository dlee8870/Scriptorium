import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid credentials. Please try again.');

      if (response.status === 200) {
        const { firstname, lastname } = data;

        document.cookie = `firstname=${encodeURIComponent(firstname)}; path=/; SameSite=Lax`;
        document.cookie = `lastname=${encodeURIComponent(lastname)}; path=/; SameSite=Lax`;

        router.push('/welcome'); // Redirect to Welcome page
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center py-10">
      <div className="app-card w-full max-w-md p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-400">Access saved templates, comments, votes, and reports.</p>
        {error && <div className="alert-error mt-5">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="pt-2">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input mt-2"
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input mt-2"
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
          >
            Login
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          New here?{' '}
          <button onClick={() => router.push('/signup')} className="font-semibold text-blue-300 hover:text-white">
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}



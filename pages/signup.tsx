import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    avatar: '/uploads/default.png',
    phoneNumber: null,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'An error occurred. Please try again.');
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000); // Redirect to login after 2 seconds
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center py-10">
      <div className="app-card w-full max-w-md p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Join Scriptorium</p>
        <h1 className="mt-2 text-3xl font-black text-white">Signup</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create your account to start using Scriptorium.
        </p>
        {error && <div className="alert-error mt-5">{error}</div>}
        {success && <div className="alert-success mt-5">{success}</div>}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="form-label">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="form-input mt-2"
              required
            />
          </div>
          <div>
            <label className="form-label">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="form-input mt-2"
              required
            />
          </div>
          <div>
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
            className="btn-danger w-full"
          >
            Signup
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="font-semibold text-blue-300 hover:text-white"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

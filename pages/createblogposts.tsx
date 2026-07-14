import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context;
  const cookies = req.cookies;

  const token = cookies.token || null;

  return {
    props: {
      token,
    },
  };
};

export default function CreateBlogPost({ token }: { token: string | null }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    templateIds: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('You are not authenticated. Please log in.');
      return;
    }

    const parsedTemplateIds = formData.templateIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id)
      .map(Number);

    if (parsedTemplateIds.some((id) => isNaN(id))) {
      setError('Template IDs must be valid numbers.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tags: (formData.tags || '').split(',').map((tag) => tag.trim()),
          templateIds: parsedTemplateIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating blog post:', errorData);
        throw new Error(errorData.message || 'Failed to create blog post');
      }

      console.log('Blog post created successfully!');
      router.push('/blogposts');
    } catch (err: any) {
      console.error('Error:', err.message);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-narrow-page">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Publish</p>
        <h1 className="mt-2 text-4xl font-black text-white">Create a New Blog Post</h1>
        <p className="mt-2 text-slate-300">Write a post and optionally link it to saved code templates.</p>
      </div>
      {error && <div className="alert-error mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="app-card space-y-6 p-6">
        <div>
          <label className="form-label">Post Title</label>
          <p className="form-hint">
            This is the title of your blog post.
          </p>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input mt-2"
            placeholder="Enter your post title"
            required
          />
        </div>
        <div>
          <label className="form-label">Description</label>
          <p className="form-hint">
            Write a brief description or summary for your blog post.
          </p>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-textarea mt-2"
            rows={5}
            placeholder="Write a brief description of your post"
            required
          ></textarea>
        </div>
        <div>
          <label className="form-label">Tags</label>
          <p className="form-hint">
            Add relevant tags separated by commas (e.g., technology, coding, web development).
          </p>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="form-input mt-2"
            placeholder="e.g., technology, coding, web development"
          />
        </div>
        <div>
          <label className="form-label">Template IDs</label>
          <input
            type="text"
            name="templateIds"
            value={formData.templateIds}
            onChange={handleChange}
            className="form-input mt-2"
            placeholder="e.g., 1, 2, 3"
          />
          <p className="form-hint">Optional, comma-separated.</p>
        </div>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}

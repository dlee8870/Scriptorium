import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import jwt from 'jsonwebtoken';
import Image from 'next/image';

interface BlogPost {
  id: number;
  title: string;
  description: string;
  tags: { name: string }[];
  user: { id: number; firstName: string; lastName: string; avatar: string };
  createdAt: string;
  upvotes: number;
  downvotes: number;
  hidden: boolean;
  reports: { reason: string; createdAt: string }[];
}

interface BlogPostsPageProps {
  token: string | null;
  userId: number | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const token = context.req.cookies.token || null;
  const SECRET_KEY = process.env.JWT_SECRET || 'development_secret';
  let userId = null;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, SECRET_KEY) as { userId: number };
      userId = decodedToken.userId;
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }

  return {
    props: {
      token,
      userId,
    },
  };
};

export default function BlogPostsPage({ token, userId }: BlogPostsPageProps) {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'date' | 'rating'>('date');
  const router = useRouter();

  const fetchBlogPosts = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/blogs?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}&sort=${sortOrder}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch blog posts');
      }

      const { blogPosts: posts, totalCount } = await res.json();
      const visiblePosts = posts.filter((post: BlogPost) => !post.hidden || post.user.id === userId);

      setBlogPosts(visiblePosts);
      setTotalPages(Math.max(Math.ceil(totalCount / 10), 1));
    } catch (err: any) {
      console.error('Error fetching blog posts:', err.message);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortOrder, token, userId]);

  useEffect(() => {
    fetchBlogPosts(currentPage);
  }, [currentPage, fetchBlogPosts]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCreatePost = () => {
    if (!token) {
      router.push('/login');
      return;
    }
    router.push('createblogposts');
  };

  const handleDelete = async (postId: number) => {
    try {
      const response = await fetch(`/api/blogs/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Failed to delete post');
      }
      fetchBlogPosts(currentPage);
    } catch (error) {
      console.error('Delete failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete post');
    }
  };

  const handleVote = async (postId: number, type: 'upvote' | 'downvote') => {
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: postId, type, itemType: 'blogPost' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Failed to ${type}`);
      }
      fetchBlogPosts(currentPage);
    } catch (error) {
      console.error(`${type} failed:`, error);
      setError(error instanceof Error ? error.message : `Failed to ${type}`);
    }
  };

  return (
    <div className="app-page">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Community</p>
          <h1 className="mt-2 text-4xl font-black text-white">Blog Posts</h1>
          <p className="mt-2 text-slate-300">Search examples, discussions, and linked code templates.</p>
        </div>
        <button onClick={handleCreatePost} className="btn-primary">
          Create New Post
        </button>
      </div>

      <div className="app-card mb-5 grid gap-3 p-4 md:grid-cols-[1fr_220px]">
        <input
          type="text"
          placeholder="Search blog posts..."
          value={searchQuery}
          onChange={handleSearch}
          className="form-input"
        />
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as 'date' | 'rating');
            setCurrentPage(1);
          }}
          className="form-input"
        >
          <option value="date">Sort by Date</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      {loading ? (
        <div className="app-card p-8 text-center text-slate-300">Loading posts...</div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : blogPosts.length > 0 ? (
        <div className="space-y-4">
          {blogPosts.map((post) => (
            <article key={post.id} className="app-card p-5 transition hover:border-slate-500">
              <div className="flex gap-4">
                <Image
                  src={post.user?.avatar || '/uploads/default.png'}
                  alt={`${post.user?.firstName || 'Unknown'}'s avatar`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border border-slate-700 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <button
                    className="text-left text-xl font-bold text-white transition hover:text-blue-300"
                    onClick={() => router.push(`/blogposts/${post.id}`)}
                  >
                    {post.title}
                  </button>
                  <p className="mt-1 text-sm text-slate-400">
                    By {post.user?.firstName || 'Unknown'} {post.user?.lastName || ''} on{' '}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {post.hidden && post.user.id === userId && (
                <div className="mt-4 rounded-md border border-yellow-500/40 bg-yellow-950/40 p-3 text-sm text-yellow-100">
                  <p className="font-semibold">This post is hidden. Reports:</p>
                  <ul className="mt-2 list-disc pl-5">
                    {post.reports.map((report, index) => (
                      <li key={index}>{report.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 leading-7 text-slate-300">{post.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.tags?.map((tag) => (
                  <span key={tag.name} className="tag-pill">
                    {tag.name}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleVote(post.id, 'upvote')}
                  disabled={!token || (post.hidden && post.user.id !== userId)}
                  className="btn-success"
                >
                  Upvote {post.upvotes}
                </button>
                <button
                  onClick={() => handleVote(post.id, 'downvote')}
                  disabled={!token || (post.hidden && post.user.id !== userId)}
                  className="btn-danger"
                >
                  Downvote {post.downvotes}
                </button>
                {post.user.id === userId && (
                  <button onClick={() => handleDelete(post.id)} className="btn-secondary">
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="app-card p-8 text-center text-slate-300">No blog posts available.</div>
      )}

      <footer className="mt-6 flex items-center justify-between">
        <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="btn-secondary">
          Previous
        </button>
        <span className="text-sm font-semibold text-slate-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="btn-secondary"
        >
          Next
        </button>
      </footer>
    </div>
  );
}

import { format } from 'date-fns';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import jwt from 'jsonwebtoken';
import Image from 'next/image';
import { getJwtSecret } from '@/utils/serverEnv';

interface BlogPost {
  id: number;
  title: string;
  description: string;
  tags: { name: string }[];
  templates: { id: number }[];
  user: { id: number; firstName: string; lastName: string; avatar: string } | null;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote: 'upvote' | 'downvote' | null;
  hidden?: boolean;
}

interface Comment {
  id: number;
  content: string;
  user: { id: number; firstName: string; lastName: string; avatar: string } | null;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote: 'upvote' | 'downvote' | null;
}

interface BlogPostPageProps {
  blogPost?: BlogPost;
  token: string | null;
  error?: string;
  userId: number | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.query;
  const token = context.req.cookies.token || null;
  const host = context.req.headers.host;
  const forwardedProtocol = context.req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol?.split(',')[0] || 'http';
  const applicationUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : host
      ? `${protocol}://${host}`
      : null;

  if (!id || !applicationUrl) {
    return { notFound: true };
  }

  try {
    const res = await fetch(`${applicationUrl}/api/blogs/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const SECRET_KEY = getJwtSecret();
    let userId = null;

    if (token) {
      try {
        const decodedToken = jwt.verify(token, SECRET_KEY) as { userId: number };
        userId = decodedToken.userId;
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    if (!res.ok) {
      throw new Error('Failed to fetch blog post');
    }

    const blogPost = await res.json();
    return { props: { blogPost, token, userId } };
  } catch (error: unknown) {
    console.error('Error fetching blog post:', error instanceof Error ? error.message : error);
    return { props: { error: 'Failed to load blog post', token, userId: null } };
  }
};

export default function BlogPostPage({ blogPost, token, error, userId }: BlogPostPageProps) {
  const [post] = useState<BlogPost | null>(blogPost || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: blogPost?.title || '',
    description: blogPost?.description || '',
    tags: Array.isArray(blogPost?.tags) ? blogPost.tags.map((tag) => tag.name).join(', ') : '',
    templates: Array.isArray(blogPost?.templates) ? blogPost.templates.map((template) => template.id).join(', ') : '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<'date' | 'rating'>('date');
  const router = useRouter();

  const fetchComments = useCallback(async () => {
    if (!post?.id) return;

    try {
      const res = await fetch(`/api/blogs/${post.id}/comments?sort=${sortCriteria}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to fetch comments');
      setComments(await res.json());
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  }, [post?.id, sortCriteria, token]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  if (error || !post) {
    return (
      <div className="app-narrow-page">
        <div className="app-card p-8 text-center text-slate-300">Blog post not found.</div>
      </div>
    );
  }

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (isVoting) return;
    setIsVoting(true);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: post.id, type: voteType, itemType: 'blogPost' }),
      });

      if (!res.ok) throw new Error(`Failed to ${voteType}`);
      router.reload();
    } catch (error) {
      console.error(`Error during ${voteType}:`, error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleEdit = async () => {
    if (userId !== post.user?.id) {
      setErrorMessage('You are not authorized to edit this blog post.');
      return;
    }

    if (post.hidden) {
      setErrorMessage('Editing is not allowed because this post is hidden.');
      return;
    }

    try {
      const res = await fetch(`/api/blogs/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          templateIds: formData.templates
            .split(',')
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !Number.isNaN(id)),
        }),
      });

      if (!res.ok) throw new Error('Failed to update blog post');
      router.reload();
    } catch (error) {
      console.error('Error updating blog post:', error);
      setErrorMessage('Failed to update blog post.');
    }
  };

  const handleAddComment = async () => {
    if (!token) {
      setErrorMessage('Please log in to comment.');
      return;
    }

    if (!newComment.trim()) {
      setErrorMessage('Comment cannot be empty.');
      return;
    }

    try {
      const res = await fetch('/api/comments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, blogPostId: post.id }),
      });

      if (!res.ok) throw new Error('Failed to add comment');
      router.reload();
    } catch (err: unknown) {
      console.error('Error adding comment:', err instanceof Error ? err.message : err);
    }
  };

  const handleReportPost = async (reason: string) => {
    if (!token) {
      setErrorMessage('Please log in to report content.');
      return;
    }

    try {
      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, blogPostId: post.id }),
      });

      if (!res.ok) throw new Error('Failed to submit report');
      alert('Report submitted successfully!');
    } catch (error) {
      console.error('Error reporting content:', error);
    }
  };

  const handleReportComment = async (commentId: number, reason: string) => {
    if (!token) {
      setErrorMessage('Please log in to report comments.');
      return;
    }

    try {
      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, commentId }),
      });

      if (!res.ok) throw new Error('Failed to submit report');
      alert('Comment report submitted successfully!');
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const handleCommentVote = async (commentId: number, voteType: 'upvote' | 'downvote') => {
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: commentId, type: voteType, itemType: 'comment' }),
      });

      if (!res.ok) throw new Error(`Failed to ${voteType} comment`);
      fetchComments();
    } catch (error) {
      console.error(`Error during comment ${voteType}:`, error);
    }
  };

  const handleEditComment = async (commentId: number, currentContent: string) => {
    const updatedContent = prompt('Edit your comment:', currentContent);
    if (!updatedContent || updatedContent.trim() === '') return;

    try {
      const res = await fetch(`/api/comments/${commentId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: updatedContent }),
      });

      if (!res.ok) throw new Error('Failed to update comment');
      router.reload();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${commentId}/delete`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete comment');
      router.reload();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="app-narrow-page">
      {errorMessage && <div className="alert-error mb-4">{errorMessage}</div>}

      <article className="app-card p-6">
        {isEditing ? (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="Title"
            />
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea min-h-32"
              placeholder="Description"
            />
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="form-input"
              placeholder="Tags (comma-separated)"
            />
            <input
              type="text"
              value={formData.templates}
              onChange={(e) => setFormData({ ...formData, templates: e.target.value })}
              className="form-input"
              placeholder="Template IDs (comma-separated)"
            />
            <div className="flex gap-2">
              <button onClick={handleEdit} className="btn-primary">
                Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-4xl font-black text-white">{post.title || 'Untitled'}</h1>
                <p className="mt-2 text-sm text-slate-400">
                  {post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : 'Invalid Date'}
                  {post.user && (
                    <span className="ml-2">
                      by {post.user.firstName} {post.user.lastName}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className={userId === post.user?.id ? 'btn-primary' : 'btn-secondary'}
                  disabled={userId !== post.user?.id || post.hidden}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter a reason for reporting this content:');
                    if (reason) handleReportPost(reason);
                  }}
                  className="btn-danger"
                >
                  Report Post
                </button>
              </div>
            </div>

            <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-200">
              {post.description || 'No content available.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span key={index} className="tag-pill">
                  {tag.name}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {post.templates.map((template, index) => (
                <a key={index} href={`/codespace?templateId=${template.id}`} className="btn-secondary">
                  Template #{template.id}
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleVote('upvote')}
                disabled={isVoting || !token}
                className={`btn-success ${post.userVote === 'upvote' ? 'ring-2 ring-emerald-300' : ''}`}
              >
                Upvote ({post.upvotes || 0})
              </button>
              <button
                onClick={() => handleVote('downvote')}
                disabled={isVoting || !token}
                className={`btn-danger ${post.userVote === 'downvote' ? 'ring-2 ring-red-300' : ''}`}
              >
                Downvote ({post.downvotes || 0})
              </button>
            </div>
          </>
        )}
      </article>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Comments</h2>
          <select
            className="form-input max-w-44"
            value={sortCriteria}
            onChange={(e) => setSortCriteria(e.target.value as 'date' | 'rating')}
          >
            <option value="date">Sort by Date</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>

        <div className="space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="app-card p-5">
              <div className="flex items-center gap-3">
                <Image
                  src={comment.user?.avatar || '/uploads/default.png'}
                  alt={`${comment.user?.firstName || 'Anonymous'}'s avatar`}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                />
                <div>
                  <p className="font-bold text-white">
                    {comment.user?.firstName || 'Anonymous'} {comment.user?.lastName || ''}
                  </p>
                  <p className="text-sm text-slate-400">{format(new Date(comment.createdAt), 'yyyy-MM-dd')}</p>
                </div>
              </div>
              <p className="mt-4 leading-7 text-slate-200">{comment.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => handleCommentVote(comment.id, 'upvote')} className="btn-success" disabled={!token}>
                  Upvote {comment.upvotes}
                </button>
                <button onClick={() => handleCommentVote(comment.id, 'downvote')} className="btn-danger" disabled={!token}>
                  Downvote {comment.downvotes}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter a reason for reporting this comment:');
                    if (reason) handleReportComment(comment.id, reason);
                  }}
                  className="btn-secondary"
                >
                  Report Comment
                </button>
                {comment.user?.id === userId && (
                  <>
                    <button onClick={() => handleEditComment(comment.id, comment.content)} className="btn-secondary">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteComment(comment.id)} className="btn-secondary">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card mt-6 p-5">
        <label className="form-label">Add a comment</label>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="form-textarea mt-2 min-h-28"
          placeholder="Write a comment..."
        />
        <button onClick={handleAddComment} className="btn-primary mt-3">
          Add Comment
        </button>
      </section>
    </div>
  );
}

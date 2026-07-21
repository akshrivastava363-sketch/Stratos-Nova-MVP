import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('blogs').select('*').eq('slug', slug).eq('is_published', true).single()
      .then(({ data }) => { setPost(data); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-nova-950">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-10"><div className="skeleton h-96" /></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-nova-950">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center text-white/40">
          Post not found. <Link to="/blog" className="text-accent-400">Back to blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/blog" className="text-sm text-white/40 hover:text-white">← Back to blog</Link>
        {post.cover_image_url && <img src={post.cover_image_url} className="mt-4 h-64 w-full rounded-2xl object-cover" />}
        <h1 className="mt-4 font-display text-3xl font-bold">{post.title}</h1>
        <div className="mt-2 text-sm text-white/40">{new Date(post.published_at).toLocaleDateString()}</div>
        <div className="mt-6 whitespace-pre-line text-white/70">{post.content}</div>
      </div>
    </div>
  );
}

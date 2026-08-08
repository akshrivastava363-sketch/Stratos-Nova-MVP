import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('blogs').select('*').eq('is_published', true).order('published_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-1 font-display text-3xl font-bold">Blog</h1>
        <p className="mb-8 text-white/50">Hiring tips and product updates.</p>
        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28" />)}</div>
        ) : posts.length === 0 ? (
          <div className="card py-16 text-center text-white/40">No posts published yet.</div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <Link to={`/blog/${p.slug}`} key={p.id} className="card block">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="mt-1 text-sm text-white/50">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

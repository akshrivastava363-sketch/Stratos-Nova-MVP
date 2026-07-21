import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import Navbar from '../../components/Navbar';

export default function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <Construction size={40} className="mb-4 text-accent-400" />
        <h1 className="font-display text-2xl font-bold">{title || 'This page'} is coming in the next phase</h1>
        <p className="mt-2 max-w-md text-white/50">
          Phase 1 shipped the core platform foundation. This module is scheduled for a following build phase.
        </p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  );
}

import { Component } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

// A page rendering error with no boundary above it unmounts the entire
// app (blank/black screen). This catches it locally instead, so one
// broken route shows a visible error rather than taking down the page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <AlertTriangle size={32} className="mb-4 text-red-400" />
          <h1 className="mb-2 font-display text-xl font-bold">This page couldn't be displayed</h1>
          <p className="mb-6 max-w-md text-sm text-white/50">{this.state.message}</p>
          <Link to="/admin/users" className="btn-primary">Back to Users</Link>
        </div>
      );
    }
    return this.props.children;
  }
}

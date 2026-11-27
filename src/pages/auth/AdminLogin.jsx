import Login from './Login';

export default function AdminLogin() {
  return <Login expectedRole="admin" heading="Administrator Sign In" registerHref="/login" />;
}

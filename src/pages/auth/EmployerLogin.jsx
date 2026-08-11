import Login from './Login';

export default function EmployerLogin() {
  return <Login expectedRole="employer" heading="Employer Sign In" registerHref="/register?role=employer" />;
}

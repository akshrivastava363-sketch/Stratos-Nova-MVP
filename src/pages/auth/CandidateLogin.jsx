import Login from './Login';

export default function CandidateLogin() {
  return <Login expectedRole="candidate" heading="Candidate Sign In" registerHref="/register?role=candidate" />;
}

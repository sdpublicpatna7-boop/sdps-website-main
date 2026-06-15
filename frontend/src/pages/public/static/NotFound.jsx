import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="legacy-title text-brand-blue">404</h1>
      <p className="text-brand-ink/60 mt-2 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}

export default NotFound;

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLoader, EmptyState } from './ui';
import { Link } from 'react-router-dom';

// Sends signed-out visitors to /login and remembers where they wanted to go.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader text="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// Signed-in users do not need to see login / register again.
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Role-based access: renders a friendly "no access" page when the permission is missing.
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  if (can(permission)) return children;
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      description="Ask an administrator if you need permission."
      action={
        <Link to="/" className="btn-ghost">
          Back to overview
        </Link>
      }
    />
  );
}

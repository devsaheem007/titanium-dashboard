import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState icon={Compass} title="Page not found" description="The page you're looking for doesn't exist or was moved." action={<Link to="/" className="btn-primary">Go to overview</Link>} />
    </div>
  );
}

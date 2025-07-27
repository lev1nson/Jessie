import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
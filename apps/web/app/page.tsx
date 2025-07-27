import { redirect } from 'next/navigation';
import { getServerSession } from '../lib/auth-server';

export default async function Home() {
  const session = await getServerSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Jessie Email Assistant
        </h1>
        <p className="text-muted-foreground mb-8">
          Your intelligent email companion
        </p>
        <div className="space-y-4">
          <a
            href="/auth/login"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
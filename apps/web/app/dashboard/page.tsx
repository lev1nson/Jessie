import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth-server';
import { ChatLayout } from '@/components/features/chat/ChatLayout';
import { ChatInterface } from '@/components/features/chat/ChatInterface';
import { ChatSidebar } from '@/components/features/chat/ChatSidebar';

export default async function DashboardPage() {
  console.log('Dashboard page loading...');
  const session = await getServerSession();
  
  console.log('Dashboard session check:', {
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email
  });

  if (!session) {
    console.log('No session found, redirecting to login');
    redirect('/auth/login');
  }

  return (
    <ChatLayout sidebar={<ChatSidebar />}>
      <ChatInterface />
    </ChatLayout>
  );
}
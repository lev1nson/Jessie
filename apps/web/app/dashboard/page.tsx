import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth';
import { ChatLayout } from '@/components/features/chat/ChatLayout';
import { ChatInterface } from '@/components/features/chat/ChatInterface';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <ChatLayout>
      <ChatInterface />
    </ChatLayout>
  );
}
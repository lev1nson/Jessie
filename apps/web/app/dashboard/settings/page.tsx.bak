import { redirect } from 'next/navigation';
import { getServerSession } from '../../../lib/auth-server';
import { SettingsPage } from '@/components/features/settings/SettingsPage';

export default async function Settings() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  return <SettingsPage />;
}
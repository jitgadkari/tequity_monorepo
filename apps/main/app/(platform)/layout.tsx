import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}

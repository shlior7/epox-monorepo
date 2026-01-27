import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin-auth';
import { AdminNav } from '@/components/admin/AdminNav';
import '@/styles/admin.scss';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify admin session exists
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="admin-layout" data-testid="admin-layout">
      <AdminNav adminSession={session} />
      <main className="admin-main" data-testid="admin-main">
        {children}
      </main>
    </div>
  );
}

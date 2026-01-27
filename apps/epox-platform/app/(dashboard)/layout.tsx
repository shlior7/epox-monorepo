import { AppShell } from '@/components/layout';
import { AuthGuard } from '../../components/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell testId="app-shell">{children}</AppShell>
    </AuthGuard>
  );
}

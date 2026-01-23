import { redirect } from 'next/navigation';

// Redirect old /dashboard route to /home
export default function DashboardPage() {
  redirect('/home');
}

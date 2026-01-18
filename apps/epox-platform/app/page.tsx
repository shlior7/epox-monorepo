import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard or login based on auth state
  // For now, redirect to login
  redirect('/login');
}

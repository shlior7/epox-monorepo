import { redirect } from 'next/navigation';

export default function HomePage() {
  // Proxy handles auth - if user reaches this page, they're authenticated
  redirect('/dashboard');
}

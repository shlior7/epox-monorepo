import { redirect } from 'next/navigation';

export default function RootPage() {
  // Proxy handles auth - if user reaches this page, they're authenticated
  redirect('/home');
}

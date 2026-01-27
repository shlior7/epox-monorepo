import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative max-w-md text-center">
        {/* 404 Number */}
        <h1 className="bg-gradient-to-b from-foreground to-foreground/20 bg-clip-text text-[150px] font-bold leading-none text-transparent">
          404
        </h1>

        {/* Message */}
        <h2 className="-mt-4 mb-3 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link
              href="javascript:history.back()"
              className="inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild variant="glow">
            <Link href="/home" className="inline-flex items-center justify-center gap-2">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

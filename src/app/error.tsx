'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Error
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Something went wrong!
        </p>
        <div className="space-y-4">
          <button
            onClick={reset}
            className="block w-full bg-elegant-red-600 text-white px-6 py-3 rounded-lg hover:bg-elegant-red-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}

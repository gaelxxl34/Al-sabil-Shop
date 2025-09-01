import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          404
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          This page could not be found.
        </p>
        <Link
          href="/"
          className="inline-block bg-elegant-red-600 text-white px-6 py-3 rounded-lg hover:bg-elegant-red-700 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

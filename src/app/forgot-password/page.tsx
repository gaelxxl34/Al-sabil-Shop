import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background image: desktop uses login.png, mobile uses login-mobile.png */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="block md:hidden relative w-full h-full">
          <Image
            src="/login-mobile.png"
            alt="Forgot password background mobile"
            fill
            sizes="(max-width: 768px) 100vw, 0px"
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="hidden md:block relative w-full h-full">
          <Image
            src="/login.png"
            alt="Forgot password background"
            fill
            sizes="(min-width: 769px) 100vw, 0px"
            className="object-cover object-center"
            priority
          />
        </div>
      </div>
      {/* Overlay for darkening if needed */}
      <div className="absolute inset-0 bg-black/30 z-10" aria-hidden="true" />
      {/* Forgot password form container */}
      <div className="relative z-20 w-full max-w-[420px] p-4 md:p-6 bg-white bg-opacity-95 rounded-lg shadow-lg border border-black m-2 md:ml-12 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8 w-full">
          <Link href="/" className="block">
            <Image 
              src="/logo.png" 
              alt="Al-Ysabil Logo" 
              width={96} 
              height={96}
              priority
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '96px',
                maxHeight: '96px'
              }}
            />
          </Link>
          <h1 className="mt-4 text-lg font-bold text-black">Forgot Password</h1>
          <p className="text-sm text-gray-700 mt-2 text-center">Enter your email address and we&apos;ll send you a link to reset your password.</p>
        </div>
        <form className="flex flex-col gap-4 w-full">
          <input
            type="email"
            placeholder="Email"
            className="px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-black text-black"
            required
          />
          <button
            type="submit"
            className="bg-elegant-red-600 hover:bg-black text-white font-semibold py-2 rounded transition-colors"
          >
            Send Reset Link
          </button>
        </form>
        <div className="mt-6 text-center w-full">
          <Link href="/login" className="text-red-700 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signUpWithEmail } from './actions';
import { authClient } from '@/lib/auth/client';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SignUpClient({ covers }: { covers: string[] }) {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  const shuffled = shuffle(covers);
  const colSize = Math.ceil(shuffled.length / 3);
  const columns = [
    shuffled.slice(0, colSize),
    shuffled.slice(colSize, colSize * 2),
    shuffled.slice(colSize * 2),
  ];

  return (
    <div className="flex min-h-dvh">
      {/* Left panel - Auth form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-[#0D0D0D] px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
              <path
                d="M8 4C8 1.79 9.79 0 12 0h4c2.21 0 4 1.79 4 4v16c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V4z"
                fill="white"
              />
              <path
                d="M0 8c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v12c0 2.21-1.79 4-4 4H4c-2.21 0-4-1.79-4-4V8z"
                fill="white"
                opacity="0.6"
              />
              <path
                d="M20 8c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v12c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V8z"
                fill="white"
                opacity="0.6"
              />
            </svg>
            <h1 className="text-2xl font-bold text-white text-balance">Create your free account</h1>
            <p className="text-center text-sm text-white/50">
              Browse and search through thousands of design references. No credit card required.
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => authClient.signIn.social({ provider: 'google' })}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-transparent px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-white/40">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email form */}
          <form action={formAction} className="space-y-4">
            <input
              name="name"
              type="text"
              required
              placeholder="Full name"
              className="w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 transition"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Enter email address"
              className="w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 transition"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Create password"
              className="w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 transition"
            />

            {state?.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {isPending ? 'Creating account...' : 'Continue'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-white/40">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white/60">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-white/60">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-white underline hover:text-white/80">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel - Animated mobile app screenshots */}
      <div className="hidden lg:block lg:w-1/2 bg-[#141414] relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3 gap-3 p-6 rotate-[-6deg] scale-110">
          {columns.map((col, colIdx) => {
            const images = [...col, ...col];
            const delay = colIdx * 4;
            const itemHeight = 280;
            const scrollDistance = col.length * itemHeight;

            return (
              <div key={colIdx} className="overflow-hidden relative">
                <div
                  className="flex flex-col gap-3 auth-scroll-column"
                  style={{
                    animationDelay: `-${delay}s`,
                    ['--scroll-distance' as string]: `${scrollDistance}px`,
                    animationDuration: `${col.length * 5}s`,
                  }}
                >
                  {images.map((src, i) => (
                    <div
                      key={`${colIdx}-${i}`}
                      className="relative rounded-2xl overflow-hidden shrink-0 bg-white/5 aspect-[9/16]"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 1024px) 0vw, 18vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-[#141414] pointer-events-none z-10" />
      </div>
    </div>
  );
}

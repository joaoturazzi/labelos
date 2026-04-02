"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function LoginClient() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center px-6 md:px-10 py-5 border-b border-border">
        <Link
          href="/"
          className="text-[15px] font-bold text-text tracking-[-0.3px] no-underline"
        >
          LabelOS
        </Link>
      </header>

      {/* Sign-in */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <SignIn
          routing="hash"
          forceRedirectUrl="/dashboard/feed"
        />
      </main>
    </div>
  );
}

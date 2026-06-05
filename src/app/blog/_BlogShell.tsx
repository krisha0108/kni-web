import Link from "next/link";
import SiteHeader from "../_components/SiteHeader";

export default function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />

      {children}

      {/* Footer */}
      <footer className="mt-16 bg-[#111] px-5 py-10 text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <p>© Copyright 2026 Kitchen Network International. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/" className="hover:text-[#E71720]">Home</Link>
            <Link href="/blog" className="hover:text-[#E71720]">Blog</Link>
            <Link href="/privacy-policy" className="hover:text-[#E71720]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#E71720]">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

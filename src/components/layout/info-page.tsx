
import type { ReactNode } from "react";
import { Link } from "@/lib/next-compat";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";

interface InfoPageProps {
  title: string;
  children: ReactNode;
}

export function InfoPage({ title, children }: InfoPageProps) {
  return (
    <div className="min-h-screen bg-dark-950 gradient-bg">
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5 border-b border-dark-800/50">
        <Link href="/"><Logo size="sm" /></Link>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        <h1 className="text-3xl font-bold text-white mb-8">{title}</h1>
        <div className="prose-dark space-y-6 text-sm text-gray-400 leading-relaxed">
          {children}
        </div>
      </main>
      <footer className="border-t border-dark-800/50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-[11px] text-gray-700">
          <Link href="/about" className="hover:text-gray-400 transition-colors">About</Link>
          <Link href="/faq" className="hover:text-gray-400 transition-colors">FAQ</Link>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
          <span>© 2025 MachinistPro</span>
        </div>
      </footer>
    </div>
  );
}

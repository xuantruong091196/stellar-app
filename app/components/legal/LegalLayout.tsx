import { Link } from "@remix-run/react";

interface LegalLayoutProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#121317] text-[#e3e2e8] font-body">
      <nav className="fixed top-0 w-full z-50 bg-[#121317]/80 backdrop-blur-md shadow-2xl shadow-black/50">
        <div className="max-w-4xl mx-auto px-8 flex items-center h-16">
          <Link to="/landing" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Stelo" className="h-7 w-auto" />
            <span className="text-xl font-black text-white tracking-tighter font-headline">
              Stelo
            </span>
          </Link>
        </div>
      </nav>
      <main className="pt-24 pb-20 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold font-headline mb-2 tracking-tight">
            {title}
          </h1>
          <p className="text-on-surface-variant text-sm mb-12">
            Last updated: {updated}
          </p>
          <div className="space-y-8">{children}</div>
        </div>
      </main>
      <footer className="bg-[#0d0e12] py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <Link to="/landing" className="text-primary hover:underline text-sm">
            &larr; Back to Stelo
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold font-headline mb-3">{title}</h2>
      <div className="space-y-3 text-on-surface-variant leading-relaxed">
        {children}
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function LandingPage() {
  const { user, ready } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-[-100px] h-[420px] w-[420px] rounded-full bg-amber-200 opacity-60 blur-[120px]" />
        <div className="absolute right-[-120px] top-[30%] h-[420px] w-[420px] rounded-full bg-indigo-200 opacity-60 blur-[120px]" />
        <div className="absolute bottom-[-120px] left-[25%] h-[420px] w-[420px] rounded-full bg-pink-200 opacity-60 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] h-[420px] w-[420px] rounded-full bg-emerald-200 opacity-60 blur-[120px]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center px-8 py-6">
        <div className="flex items-center gap-3 font-semibold text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            👥
          </div>
          Campus Connect
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-140px)] items-center justify-center px-5 py-10 text-center">
        <div className="max-w-[820px] animate-[fade-up_1s_ease]">
          <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl text-white shadow-[0_25px_50px_rgba(99,102,241,0.35)]">
            👥
          </div>

          <h1 className="mb-5 text-[clamp(2.5rem,6vw,4rem)] font-extrabold text-slate-900">
            Campus <span className="text-violet-600">Connect</span>
          </h1>

          <p className="mx-auto mb-9 max-w-[620px] text-[1.05rem] leading-7 text-slate-500">
            Your gateway to meaningful campus connections. Find mentors, build
            networks, and unlock opportunities that shape your academic journey
            and beyond.
          </p>

          <Link
            className="inline-flex rounded-2xl bg-violet-600 px-9 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(124,58,237,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_60px_rgba(124,58,237,0.45)]"
            to={ready && user ? "/dashboard" : "/register"}
          >
            {ready && user ? "Open Dashboard" : "Get Started →"}
          </Link>

          <div className="mt-4 text-sm text-slate-400">
            Free to join • No credit card required
          </div>
        </div>
      </main>

      <footer className="pb-5 text-center text-sm text-slate-400">
        © 2026 Campus Connect. Empowering students everywhere.
      </footer>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;

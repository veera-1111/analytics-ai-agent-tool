"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const FEATURES = [
  {
    icon: "💬",
    title: "Ask in plain English",
    desc: "No SQL, no dashboards to configure. Just type your question and get the answer instantly.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: "📊",
    title: "Interactive charts",
    desc: "Bar, line, and pie charts appear directly in the conversation. Switch types on the fly.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: "🗄️",
    title: "Connect any database",
    desc: "Works with your existing data. Connect in seconds using a simple guided wizard.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: "⬇️",
    title: "One-click exports",
    desc: "Download any chart or report as PNG, Excel, or PDF — ready to share immediately.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: "📜",
    title: "Conversation history",
    desc: "Every session is saved. Come back days later and pick up exactly where you left off.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: "🔒",
    title: "Secure by design",
    desc: "Your credentials are encrypted at rest. Your data never leaves your own environment.",
    color: "from-rose-500 to-pink-500",
  },
];

const STEPS = [
  { step: "01", title: "Sign in with your email", desc: "No password needed. Your email links to your saved conversations so you can pick up right where you left off." },
  { step: "02", title: "Connect your data", desc: "Paste a connection string or explore the built-in demo with real logistics data — no setup required." },
  { step: "03", title: "Start asking questions", desc: "Type anything. QuantixAI returns answers, charts, and tables in seconds." },
];

const DEMO_QUESTIONS = [
  "Show me total shipments by carrier as a bar chart",
  "What is the SLA breach rate by hub?",
  "Revenue trend by month — line chart",
  "Which customers have the most delayed shipments?",
  "Compare express vs standard delivery counts",
  "Average transit days by region",
];

const STATS = [
  { value: "< 3s", label: "Average response time" },
  { value: "Any DB", label: "Works with your database" },
  { value: "3 formats", label: "PNG · Excel · PDF export" },
  { value: "∞", label: "Questions you can ask" },
];

const TESTIMONIALS = [
  {
    quote: "I used to wait two days for the BI team to build a report. Now I just ask QuantixAI and have a chart in my inbox before my next meeting.",
    name: "Sarah M.",
    role: "Head of Operations",
  },
  {
    quote: "Our logistics manager has zero SQL experience. With QuantixAI she runs her own analysis every morning without asking IT once.",
    name: "James R.",
    role: "VP of Technology",
  },
  {
    quote: "The fact that I can download a branded chart as a PDF directly from the chat has saved us hours of back-and-forth every week.",
    name: "Priya K.",
    role: "Data Analyst",
  },
];

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="group h-full bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 shadow-sm`}>
          {feature.icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  );
}

function LiveDemo() {
  const [qIdx, setQIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "thinking" | "answering">("typing");

  const ANSWERS = [
    "**FedEx leads with 381 shipments**, followed by UPS (292), USPS (226), DHL (177), and OnTrac (124). Chart rendered below.",
    "**ATL hub has the highest breach rate at 18.3%**, followed by LAX (15.1%) and ORD (12.7%). SFO is best at 6.2%.",
    "Revenue peaked in **Q4 at $284,500** (+22% MoM). Consistent growth since March.",
    "**TechCorp leads with 47 delayed shipments** — 38% of their total volume.",
    "**Express: 412 shipments (34%)**, Standard: 788 (66%). Express averages 2.1 days vs 5.4 for Standard.",
    "**Southeast averages 3.2 days**, fastest overall. Midwest is slowest at 5.8 days.",
  ];

  useEffect(() => {
    const q = DEMO_QUESTIONS[qIdx];
    setTyped(""); setPhase("typing");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(q.slice(0, i));
      if (i >= q.length) {
        clearInterval(t);
        setPhase("thinking");
        setTimeout(() => {
          setPhase("answering");
          setTimeout(() => setQIdx((p) => (p + 1) % DEMO_QUESTIONS.length), 4000);
        }, 1200);
      }
    }, 35);
    return () => clearInterval(t);
  }, [qIdx]);

  return (
    <div className="bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-gray-500">QuantixAI — Analytics Chat</span>
      </div>
      <div className="p-5 space-y-4 min-h-[240px]">
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
            {typed}
            {phase === "typing" && <span className="inline-block w-0.5 h-4 bg-white ml-0.5 animate-pulse align-middle" />}
          </div>
        </div>
        {(phase === "thinking" || phase === "answering") && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
              {phase === "thinking" ? (
                <div className="flex gap-1.5 py-1">
                  {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              ) : (
                <span className="text-xs text-gray-200" dangerouslySetInnerHTML={{ __html: ANSWERS[qIdx].replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-300">$1</strong>') }} />
              )}
            </div>
          </div>
        )}
        {phase === "answering" && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
            <div className="text-indigo-400 text-[11px] mb-2">📊 Chart · Download PNG / Excel / PDF</div>
            <div className="flex items-end gap-1 h-10">
              {[38, 29, 23, 18, 12].map((v, i) => (
                <div key={i} className="flex-1 bg-indigo-500/60 rounded-sm" style={{ height: `${v * 2.2}px` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500">Ask anything about your data…</div>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">↑</div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`QuantixAI enquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:anuruhu.tech@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="font-semibold text-green-800 dark:text-green-300">Your email client is opening!</p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">Send the pre-filled email to reach us at anuruhu.tech@gmail.com</p>
        <button onClick={() => setSent(false)} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline">Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 text-left space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your name</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          placeholder="Jane Smith" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your email</label>
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          placeholder="jane@company.com" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
        <textarea required rows={5} value={message} onChange={e => setMessage(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          placeholder="Tell us how we can help…" />
      </div>
      <button type="submit"
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm">
        Send message →
      </button>
      <p className="text-center text-xs text-gray-400">Or email us directly at{" "}
        <a href="mailto:anuruhu.tech@gmail.com" className="text-indigo-500 hover:underline">anuruhu.tech@gmail.com</a>
      </p>
    </form>
  );
}

export default function HomeContent() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToApp = () => {
    const email = localStorage.getItem("quantixai_user_email");
    router.push(email ? "/chat" : "/login");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">Q</div>
            <span className="font-bold text-lg tracking-tight">QuantixAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">Demo</a>
            <a href="#security" className="hover:text-green-600 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Security
            </a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={goToApp} className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">Sign in</button>
            <button onClick={goToApp} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
              Try free →
            </button>
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3 text-sm">
            {[["#features","Features"],["#how-it-works","How it works"],["#demo","Demo"],["#security","Security"],["#contact","Contact"]].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} className="block text-gray-600 dark:text-gray-400 hover:text-indigo-600">{l}</a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                AI-powered analytics for everyone
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
                Ask your data
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  anything.
                </span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                QuantixAI turns plain-English questions into instant answers, interactive charts, and shareable reports — no SQL, no dashboards, no waiting.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button onClick={goToApp} className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all text-sm">
                  Start for free →
                </button>
                <a href="#demo" className="px-7 py-3.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm text-center">
                  See it in action
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 justify-center lg:justify-start text-xs text-gray-400">
                {["No credit card", "No technical setup", "Works with your existing data"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full max-w-lg">
              <LiveDemo />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-indigo-600 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <AnimatedSection key={s.label}>
              <div className="text-3xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-indigo-200 text-sm">{s.label}</div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">What you can do</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Everything you need to make sense of your data</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Ask questions, explore trends, share results — all in one conversation.</p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Up and running in 60 seconds</h2>
            <p className="text-gray-500 dark:text-gray-400">Three steps. No setup, no configuration.</p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <AnimatedSection key={s.step}>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="text-4xl font-black text-indigo-100 dark:text-indigo-900 mb-4 leading-none">{s.step}</div>
                  <h3 className="text-base font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection className="text-center mt-12">
            <button onClick={goToApp} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm">
              Get started now →
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* DEMO QUESTIONS */}
      <section id="demo" className="py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Try it yourself</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">What would you like to know?</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Click any question to run it live against our demo logistics dataset.</p>
          </AnimatedSection>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {DEMO_QUESTIONS.map((q) => (
              <button key={q} onClick={() => { localStorage.setItem("quantixai_pending_query", q); goToApp(); }}
                className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-800 rounded-full text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition-colors shadow-sm">
                {q}
              </button>
            ))}
          </div>

          {/* chart preview cards */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { label: "Carrier Volume", bars: [381, 292, 226, 177, 124], names: ["FedEx", "UPS", "USPS", "DHL", "OnTrac"], color: "#6366f1" },
              { label: "Monthly Revenue", bars: [62, 71, 84, 79, 95, 118], names: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], color: "#f59e0b" },
              { label: "SLA Breach by Hub", bars: [38, 28, 18, 10, 6], names: ["ATL", "LAX", "ORD", "SFO", "JFK"], color: "#22c55e" },
            ].map((chart) => (
              <AnimatedSection key={chart.label}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-lg transition-shadow">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">{chart.label}</p>
                  <div className="flex items-end gap-1.5 h-24">
                    {chart.bars.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div className="w-full rounded-t-sm" style={{ height: `${(v / Math.max(...chart.bars)) * 80}px`, backgroundColor: chart.color + "cc" }} />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">{chart.names[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700">
                    {["PNG", "Excel", "PDF"].map((fmt) => (
                      <span key={fmt} className="text-[11px] px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600 text-gray-400">{fmt}</span>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">What people say</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Data insights, without the wait</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i}>
                <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col">
                  <div className="text-indigo-400 text-3xl mb-3 leading-none">"</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">{t.quote}</p>
                  <div className="mt-5 pt-4 border-t border-gray-50 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="py-24 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <p className="text-green-600 dark:text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Security & Privacy</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Your data never leaves your control</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              We built QuantixAI with a strict privacy-first architecture. We connect to your database to answer your questions — nothing more.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              {
                icon: "🔐",
                title: "Credentials encrypted at rest",
                desc: "Your database password and connection string are encrypted with AES-256-GCM before storage. The plain-text credential is never written to disk, never logged, and never visible to anyone — including us.",
                color: "from-indigo-500 to-violet-500",
              },
              {
                icon: "🚫",
                title: "We never store your data",
                desc: "QuantixAI does not copy, cache, or retain any rows from your database. When you ask a question, a query runs and the result is returned directly to you — nothing is saved on our side.",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: "👁️",
                title: "Read-only queries only",
                desc: "Every query QuantixAI runs is strictly a SELECT statement. It is architecturally impossible for QuantixAI to modify, delete, insert, or drop anything in your database.",
                color: "from-blue-500 to-indigo-500",
              },
              {
                icon: "⚡",
                title: "On-demand access only",
                desc: "Your database is queried only when you explicitly ask a question. There is no background scanning, no scheduled jobs, and no persistent connection kept open between sessions.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: "🗑️",
                title: "Delete anytime, instantly",
                desc: "You own your connection. Delete it from settings at any time and all stored credentials are permanently and immediately removed — no retention period, no soft-deletes.",
                color: "from-rose-500 to-pink-500",
              },
              {
                icon: "🔒",
                title: "Encrypted in transit",
                desc: "All communication between your browser, our API, and your database uses TLS encryption. Your credentials are never transmitted in plain text at any point.",
                color: "from-teal-500 to-cyan-500",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.title}>
                <div className="flex gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm h-full">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Policy summary banner */}
          <AnimatedSection>
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-800/40 flex items-center justify-center text-xl flex-shrink-0">📋</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-0.5">Our data policy in plain English</p>
                <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                  We store: your email address, your encrypted connection credentials, your chat history, and your saved dashboards.
                  We do <strong>not</strong> store: any rows, columns, or data from your database.
                  Your chat history and dashboard data are retained for 90 days and can be deleted on request.
                </p>
              </div>
              <a href="#contact" className="flex-shrink-0 text-xs font-medium text-green-700 dark:text-green-300 underline underline-offset-2 hover:text-green-900 whitespace-nowrap">
                Questions? Contact us →
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-12 shadow-2xl shadow-indigo-500/20">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to chat with your data?
              </h2>
              <p className="text-indigo-200 mb-8 text-lg max-w-md mx-auto">
                Start with our built-in demo — no database, no setup, no commitment.
              </p>
              <button onClick={goToApp}
                className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-sm">
                Launch QuantixAI →
              </button>
              <p className="mt-4 text-indigo-300 text-xs">Free to try · No credit card · Ready in seconds</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Get in touch</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Have a question?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-10">We'd love to hear from you. Fill out the form and we'll get back to you shortly.</p>
            <ContactForm />
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">Q</div>
            <span className="font-semibold text-sm">QuantixAI</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400">Intelligent analytics for everyone</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">Demo</a>
            <a href="#security" className="hover:text-green-600 transition-colors">Security</a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">Contact</a>
            <button onClick={goToApp} className="hover:text-indigo-600 transition-colors">Launch app →</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

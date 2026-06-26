"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── tiny helpers ──────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "💬",
    title: "Natural Language Queries",
    desc: "Ask questions in plain English. QuantixAI writes and runs the SQL for you — no code, no dashboards to build.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: "📊",
    title: "Instant Interactive Charts",
    desc: "Bar, line, and pie charts rendered directly in the conversation. Switch types, download PNG, Excel, or PDF with one click.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: "🗄️",
    title: "Connect Any Database",
    desc: "PostgreSQL, MySQL, SQLite — connect in seconds with a guided wizard. Your credentials are encrypted at rest.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: "🧠",
    title: "Powered by Claude on Bedrock",
    desc: "Uses Anthropic's Claude with native tool-use to write precise SQL, self-correct errors, and explain results in plain language.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: "📜",
    title: "Conversation History",
    desc: "Every session is saved per user. Come back days later and pick up exactly where you left off.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: "⚡",
    title: "Fully Serverless on AWS",
    desc: "Lambda + API Gateway + Amplify + DynamoDB. Zero servers to manage. Scales to zero when idle, scales instantly under load.",
    color: "from-rose-500 to-pink-500",
  },
];

const STEPS = [
  { step: "01", title: "Enter your email", desc: "No password needed. Your email identifies you and links to your conversation history." },
  { step: "02", title: "Connect your database", desc: "Paste your connection string or try the built-in demo with 1,200-row logistics data." },
  { step: "03", title: "Ask anything", desc: "Type a question. Claude queries your data, renders charts, and summarises insights — in seconds." },
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
  { value: "< 3s", label: "Average query time" },
  { value: "1,200+", label: "Demo dataset rows" },
  { value: "100%", label: "Serverless on AWS" },
  { value: "∞", label: "Questions you can ask" },
];

const TECH_STACK = [
  { name: "AWS Lambda", icon: "λ", color: "bg-orange-100 text-orange-700" },
  { name: "Amazon Bedrock", icon: "🤖", color: "bg-violet-100 text-violet-700" },
  { name: "DynamoDB", icon: "🗃️", color: "bg-blue-100 text-blue-700" },
  { name: "AWS Amplify", icon: "⚡", color: "bg-amber-100 text-amber-700" },
  { name: "Next.js 14", icon: "▲", color: "bg-gray-100 text-gray-700" },
  { name: "Claude AI", icon: "✦", color: "bg-indigo-100 text-indigo-700" },
  { name: "FastAPI", icon: "🐍", color: "bg-green-100 text-green-700" },
  { name: "PostgreSQL", icon: "🐘", color: "bg-sky-100 text-sky-700" },
];

// ── components ────────────────────────────────────────────────────────────────
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

// ── fake terminal component ───────────────────────────────────────────────────
function LiveDemo() {
  const [qIdx, setQIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "thinking" | "answering">("typing");

  const ANSWERS = [
    "**FedEx leads with 381 shipments**, followed by UPS (292), USPS (226), DHL (177), and OnTrac (124). Chart rendered below.",
    "**ATL hub has the highest breach rate at 18.3%**, followed by LAX (15.1%) and ORD (12.7%). SFO is best at 6.2%.",
    "Revenue peaked in **Q4 at $284,500** (+22% MoM). Trend line shows consistent growth since March.",
    "**TechCorp leads with 47 delayed shipments** — 38% of their total volume. Recommend escalating to account manager.",
    "**Express: 412 shipments (34%)**, Standard: 788 (66%). Express has 2.1-day avg transit vs 5.4 days for Standard.",
    "**Southeast region averages 3.2 days**, fastest overall. Midwest is slowest at 5.8 days due to hub congestion.",
  ];

  useEffect(() => {
    const q = DEMO_QUESTIONS[qIdx];
    setTyped("");
    setPhase("typing");
    let i = 0;
    const typingTimer = setInterval(() => {
      i++;
      setTyped(q.slice(0, i));
      if (i >= q.length) {
        clearInterval(typingTimer);
        setPhase("thinking");
        setTimeout(() => {
          setPhase("answering");
          setTimeout(() => {
            setQIdx((prev) => (prev + 1) % DEMO_QUESTIONS.length);
          }, 4000);
        }, 1200);
      }
    }, 35);
    return () => clearInterval(typingTimer);
  }, [qIdx]);

  return (
    <div className="bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-gray-500 font-mono">QuantixAI — Analytics Chat</span>
      </div>

      <div className="p-5 space-y-4 min-h-[240px]">
        {/* user message */}
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] font-mono">
            {typed}
            {phase === "typing" && <span className="inline-block w-0.5 h-4 bg-white ml-0.5 animate-pulse align-middle" />}
          </div>
        </div>

        {/* agent response */}
        {(phase === "thinking" || phase === "answering") && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 text-sm rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
              {phase === "thinking" ? (
                <div className="flex gap-1.5 py-1">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <span className="font-mono text-xs text-gray-200" dangerouslySetInnerHTML={{ __html: ANSWERS[qIdx].replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-300">$1</strong>') }} />
              )}
            </div>
          </div>
        )}

        {/* mini chart preview when answering */}
        {phase === "answering" && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-xs text-gray-400 font-mono">
            <div className="text-indigo-400 mb-2 text-[11px]">📊 Chart rendered • PNG / Excel / PDF ↓</div>
            <div className="flex items-end gap-1 h-10">
              {[38, 29, 23, 18, 12].map((v, i) => (
                <div key={i} className="flex-1 bg-indigo-500/60 rounded-sm transition-all duration-500" style={{ height: `${v * 2.2}px` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* input bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono">Ask anything about your data…</div>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">↑</div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function HomeContent() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToApp = () => {
    const email = localStorage.getItem("quantixai_user_email");
    router.push(email ? "/chat" : "/login");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">Q</div>
            <span className="font-bold text-lg tracking-tight">QuantixAI</span>
          </div>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#tech-stack" className="hover:text-indigo-600 transition-colors">Tech stack</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">Demo</a>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={goToApp} className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">Sign in</button>
            <button onClick={goToApp} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
              Try free →
            </button>
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>

        {/* mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3 text-sm">
            {["#features", "#how-it-works", "#tech-stack", "#demo"].map((h) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} className="block capitalize text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">
                {h.replace("#", "").replace(/-/g, " ")}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            {/* left copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Powered by Claude on Amazon Bedrock
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
                Ask your data
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  anything.
                </span>
              </h1>

              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                QuantixAI is a serverless AI analytics agent that turns natural language into SQL queries, renders interactive charts, and saves every conversation — all on AWS.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button onClick={goToApp}
                  className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 text-sm">
                  Start for free →
                </button>
                <a href="#demo"
                  className="px-7 py-3.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm text-center">
                  See live demo
                </a>
              </div>

              {/* trust row */}
              <div className="mt-8 flex flex-wrap items-center gap-4 justify-center lg:justify-start text-xs text-gray-400">
                {["No credit card", "No server setup", "Fully serverless"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* right demo widget */}
            <div className="flex-1 w-full max-w-lg">
              <LiveDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
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

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Everything you need to analyse data with AI</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">No dashboards to configure. No SQL to write. Just ask your question and get answers, charts, and exports instantly.</p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Up and running in 60 seconds</h2>
            <p className="text-gray-500 dark:text-gray-400">Three steps. No setup, no config, no dashboards.</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <AnimatedSection key={s.step}>
                <div className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-indigo-200 to-transparent dark:from-indigo-800 z-0 translate-x-4" />
                  )}
                  <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-4xl font-black text-indigo-100 dark:text-indigo-900 mb-4 leading-none">{s.step}</div>
                    <h3 className="text-base font-bold mb-2">{s.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                  </div>
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

      {/* ── DEMO QUESTIONS ── */}
      <section id="demo" className="py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Try it now</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">What would you like to know?</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Click any question to try it in the live demo with real logistics data.</p>
          </AnimatedSection>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {DEMO_QUESTIONS.map((q) => (
              <button key={q} onClick={() => { localStorage.setItem("quantixai_pending_query", q); goToApp(); }}
                className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-800 rounded-full text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition-colors shadow-sm">
                {q}
              </button>
            ))}
          </div>

          {/* data model preview */}
          <AnimatedSection>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Demo dataset — Logistics DB</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { table: "shipments", rows: "1,200", cols: ["id", "carrier_id", "hub_id", "customer_id", "status", "transit_days", "sla_breach", "revenue", "shipped_at"] },
                  { table: "customers", rows: "120", cols: ["id", "name", "region", "segment", "email"] },
                  { table: "hubs", rows: "8", cols: ["id", "city", "region", "capacity", "active"] },
                  { table: "carriers", rows: "5", cols: ["id", "name", "service_type", "rating", "on_time_pct"] },
                ].map((t) => (
                  <div key={t.table} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{t.table}</span>
                      <span className="text-[10px] text-gray-400">{t.rows} rows</span>
                    </div>
                    <div className="space-y-1">
                      {t.cols.slice(0, 5).map((c) => (
                        <div key={c} className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">• {c}</div>
                      ))}
                      {t.cols.length > 5 && <div className="text-[11px] text-gray-400">+{t.cols.length - 5} more</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CHART PREVIEW ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Visualisations</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Charts rendered in the conversation</h2>
            <p className="text-gray-500 dark:text-gray-400">Switch between bar, line, and pie. Download as PNG, Excel, or PDF — all in one click.</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { type: "Bar Chart", icon: "▬", label: "Carrier Shipment Volume", bars: [381, 292, 226, 177, 124], names: ["FedEx", "UPS", "USPS", "DHL", "OnTrac"], color: "#6366f1" },
              { type: "Line Chart", icon: "⌇", label: "Monthly Revenue Trend", bars: [62, 71, 84, 79, 95, 118], names: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], color: "#f59e0b" },
              { type: "Pie Chart", icon: "◕", label: "SLA Breach by Hub", bars: [38, 28, 18, 10, 6], names: ["ATL", "LAX", "ORD", "SFO", "JFK"], color: "#22c55e" },
            ].map((chart) => (
              <AnimatedSection key={chart.type}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{chart.label}</span>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">{chart.type}</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-24 mt-4">
                    {chart.bars.map((v, i) => (
                      <div key={i} className="flex-1 rounded-t-sm flex flex-col justify-end gap-1">
                        <div className="rounded-sm transition-all duration-700" style={{ height: `${(v / Math.max(...chart.bars)) * 80}px`, backgroundColor: chart.color + "cc" }} />
                        <span className="text-[9px] text-gray-400 text-center truncate">{chart.names[i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700">
                    {["PNG", "Excel", "PDF"].map((fmt) => (
                      <span key={fmt} className="text-[11px] px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600 text-gray-500 dark:text-gray-400">{fmt}</span>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="tech-stack" className="py-24 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">Architecture</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Built on a proven serverless stack</h2>
            <p className="text-gray-500 dark:text-gray-400">100% AWS-native. Zero servers to manage. Scales to zero when idle.</p>
          </AnimatedSection>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {TECH_STACK.map((t) => (
              <AnimatedSection key={t.name}>
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent ${t.color} text-sm font-medium`}>
                  <span>{t.icon}</span>{t.name}
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* architecture diagram */}
          <AnimatedSection>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6 text-center">Request flow</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm flex-wrap">
                {[
                  { label: "Browser", sub: "Next.js / Amplify", icon: "🌐" },
                  { label: "API Gateway", sub: "HTTP API", icon: "🔀" },
                  { label: "Lambda", sub: "FastAPI + Mangum", icon: "λ" },
                  { label: "Bedrock", sub: "Claude Haiku 4.5", icon: "🤖" },
                  { label: "Database", sub: "Your DB / SQLite", icon: "🗄️" },
                ].map((node, i, arr) => (
                  <div key={node.label} className="flex items-center gap-2">
                    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 min-w-[90px] text-center border border-gray-100 dark:border-gray-700">
                      <span className="text-xl mb-1">{node.icon}</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{node.label}</span>
                      <span className="text-[10px] text-gray-400">{node.sub}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-gray-300 dark:text-gray-600 text-lg hidden sm:block">→</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-gray-400">
                <span>↕ DynamoDB — Sessions + History</span>
                <span>↕ S3 — Demo dataset + Exports</span>
                <span>↕ Secrets Manager — DB credentials</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-12 shadow-2xl shadow-indigo-500/20">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to chat with your data?
              </h2>
              <p className="text-indigo-200 mb-8 text-lg">
                Start with the built-in demo dataset — no database required.
              </p>
              <button onClick={goToApp}
                className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-sm">
                Launch QuantixAI →
              </button>
              <p className="mt-4 text-indigo-300 text-xs">Free · No credit card · Serverless on AWS</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">Q</div>
            <span className="font-semibold text-sm">QuantixAI</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400">AI analytics on AWS</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#tech-stack" className="hover:text-indigo-600 transition-colors">Tech stack</a>
            <button onClick={goToApp} className="hover:text-indigo-600 transition-colors">Launch app →</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

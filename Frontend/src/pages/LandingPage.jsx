import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Users, Video, Sparkles, ChevronRight } from "lucide-react";

const W =
  "w-full max-w-[1800px] mx-auto px-5 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20";
const GAP = "pb-section";

const focus =
  " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const WHO = {
  candidate: { label: "candidate", color: "#5e6ad2" },
  interviewer: { label: "interviewer", color: "#f59e0b" },
};

const SCRIPT = [
  {
    who: "candidate",
    text: "function twoSum(nums, target) {\n  const seen = new Map();\n",
  },
  { who: "interviewer", text: "  // what is the time complexity here?\n" },
  {
    who: "candidate",
    text: "  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n",
  },
];

const TOTAL = SCRIPT.reduce(function (sum, s) {
  return sum + s.text.length;
}, 0);

const PILLARS = [
  {
    icon: Users,
    title: "Real-time by default",
    body: "Edits, cursors, chat and problem changes reach everyone in the room instantly.",
  },
  {
    icon: Video,
    title: "Nothing to install",
    body: "Candidates join from a link in the browser. Video runs peer to peer.",
  },
  {
    icon: Sparkles,
    title: "Hints, not answers",
    body: "The AI nudges the next step from the candidate's own code and never writes the solution.",
  },
];

const SECTIONS = [
  {
    id: "editor",
    title: ["Shared editor", "and live cursors"],
    body: "Interviewer and candidate type in the same Monaco editor. Edits merge without conflicts and every cursor carries a name.",
    visual: "editor",
    facts: [
      "Monaco editor",
      "Yjs CRDT sync",
      "Named remote cursors",
      "Six languages",
    ],
  },
  {
    id: "video",
    title: ["Video and chat", "in the same room"],
    body: "Video floats over the editor, so nobody switches tabs. Chat keeps questions and answers next to the code.",
    img: "/screenshots/video.png",
    alt: "Video call overlay on top of the Intervue editor",
    facts: [
      "Peer-to-peer WebRTC",
      "Mic and camera controls",
      "Room chat with unread badge",
    ],
  },
  {
    id: "hints",
    title: ["AI hints that", "don't give it away"],
    body: "A stuck candidate can ask for a nudge. The model reads their actual code and points at the next step, in two or three sentences.",
    img: "/screenshots/hint.png",
    alt: "An AI hint shown in a modal over the editor",
    facts: [
      "Llama 3.3 70B on Groq",
      "Reads the current code",
      "Rate-limited per hour",
    ],
  },
  {
    id: "rooms",
    title: ["Rooms and", "one shared link"],
    body: "Create a room, pick a language and send the link. The host writes the problem and everyone sees it update live.",
    img: "/screenshots/dashboard.png",
    alt: "The Intervue dashboard listing interview rooms",
    facts: [
      "Rooms last 24 hours",
      "Join by invite link",
      "Host edits the problem",
    ],
  },
];

const BUILT_WITH = [
  "React",
  "Yjs",
  "WebRTC",
  "Socket.io",
  "PostgreSQL",
  "Groq",
];

/* ---------- 1. Scroll reveal hook ---------- */
function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    // Reduced motion => show instantly
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return function () {
      io.disconnect();
    };
  }, []);

  return [ref, shown];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(28px)",
        transition:
          "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
        transitionDelay: shown ? delay + "ms" : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ---------- 4. LiveEditor with typing + scroll-triggered start ---------- */
function LiveEditor() {
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(false);
  const [n, setN] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Start typing when editor scrolls into view
  useEffect(() => {
    if (reduced) {
      setN(TOTAL);
      return;
    }
    const el = wrapRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setStarted(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return function () {
      io.disconnect();
    };
  }, [reduced]);

  useEffect(
    function () {
      if (!started || reduced) return;
      const id = setInterval(function () {
        setN(function (p) {
          return p >= TOTAL + 50 ? 0 : p + 1;
        });
      }, 45);
      return function () {
        clearInterval(id);
      };
    },
    [started, reduced],
  );

  let left = n;
  const parts = SCRIPT.map(function (seg) {
    const take = Math.max(0, Math.min(seg.text.length, left));
    left -= take;
    return { who: seg.who, shown: seg.text.slice(0, take) };
  });
  let last = -1;
  parts.forEach(function (p, i) {
    if (p.shown.length > 0) last = i;
  });

  return (
    <div
      ref={wrapRef}
      className="bg-surface-1 border border-hairline rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(94,106,210,0.35),0_20px_60px_-20px_rgba(94,106,210,0.35)]"
      aria-label="Animated preview of two people editing the same code"
      role="img"
    >
      <div className="h-12 flex items-center justify-between px-lg border-b border-hairline bg-surface-2">
        <span className="text-body-sm text-ink font-medium truncate">
          Frontend engineering interview
        </span>
        <div className="flex items-center gap-md text-caption text-ink-subtle flex-shrink-0">
          <span className="flex items-center gap-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse" />
            2 online
          </span>
          <span className="hidden sm:inline">Synced</span>
        </div>
      </div>
      <pre className="font-mono text-[13px] leading-8 text-ink-muted px-lg py-xl min-h-[288px] whitespace-pre-wrap break-words">
        {parts.map(function (p, i) {
          const w = WHO[p.who];
          return (
            <span key={i} style={{ backgroundColor: w.color + "22" }}>
              {p.shown}
              {i === last && n < TOTAL && (
                <span
                  className="relative inline-block h-[1.2em] align-text-bottom animate-pulse"
                  style={{ borderLeft: "2px solid " + w.color }}
                >
                  <span
                    className="absolute -top-5 left-0 text-[10px] leading-none px-1.5 py-1 rounded text-white whitespace-nowrap font-sans font-medium"
                    style={{ backgroundColor: w.color }}
                  >
                    {w.label}
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function Frame({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-xl border border-hairline bg-surface-1 overflow-hidden transition-all duration-500 " +
        className
      }
    >
      {children}
    </div>
  );
}

/* ---------- 3. Primary button with hover/active ---------- */
function PrimaryLink({ to, children }) {
  return (
    <Link
      to={to}
      className={
        "bg-primary hover:bg-primary-hover text-white text-body-sm font-medium px-lg py-sm rounded-full " +
        "transition-all duration-200 ease-out " +
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(94,106,210,0.7)] " +
        "active:translate-y-0 active:scale-[0.97] active:shadow-none " +
        "motion-reduce:transform-none motion-reduce:transition-none " +
        focus
      }
    >
      {children}
    </Link>
  );
}

/* Reusable soft button */
function GhostLink({ to, children, external = false, href }) {
  const cls =
    "text-body-sm font-medium text-ink-muted hover:text-ink border border-hairline hover:bg-surface-1 px-lg py-sm rounded-full " +
    "transition-all duration-200 ease-out " +
    "hover:-translate-y-0.5 hover:border-ink-muted/40 " +
    "active:translate-y-0 active:scale-[0.97] " +
    "motion-reduce:transform-none motion-reduce:transition-none " +
    focus;
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

function LandingPage() {
  const hasToken = !!localStorage.getItem("token");
  const cta = hasToken ? "/dashboard" : "/register";
  const ctaLabel = hasToken ? "Open dashboard" : "Create a free room";

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <header className="sticky top-0 z-50 bg-canvas/80 backdrop-blur border-b border-hairline">
        <div className={W + " h-16 flex items-center justify-between"}>
          <Link
            to="/"
            className={
              "text-[18px] font-semibold tracking-tight rounded" + focus
            }
          >
            Intervue<span className="text-primary">.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-xl text-body-sm text-ink-subtle">
            <a
              href="#features"
              className={
                "relative hover:text-ink rounded transition-colors duration-200 " +
                "after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink " +
                "after:transition-all after:duration-300 hover:after:w-full" +
                focus
              }
            >
              Features
            </a>
            <a
              href="https://github.com/sahil78tt/intervue"
              target="_blank"
              rel="noreferrer"
              className={
                "relative hover:text-ink rounded transition-colors duration-200 " +
                "after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-ink " +
                "after:transition-all after:duration-300 hover:after:w-full" +
                focus
              }
            >
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-xs">
            {!hasToken && (
              <Link
                to="/login"
                className={
                  "text-body-sm font-medium text-ink-subtle hover:text-ink px-md py-xs rounded-full " +
                  "transition-colors duration-200 active:scale-[0.97] motion-reduce:transform-none" +
                  focus
                }
              >
                Sign in
              </Link>
            )}
            <Link
              to={cta}
              className={
                "bg-ink hover:bg-ink-muted text-canvas text-body-sm font-medium px-md py-xs rounded-full " +
                "transition-all duration-200 ease-out hover:-translate-y-0.5 " +
                "active:translate-y-0 active:scale-[0.97] motion-reduce:transform-none" +
                focus
              }
            >
              {hasToken ? "Dashboard" : "Sign up"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className={"relative " + GAP}>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[560px] pointer-events-none"
            style={{
              background:
                "radial-gradient(50% 70% at 50% 100%, rgba(94,106,210,0.28), transparent 70%)",
            }}
          />
          <div className={W + " relative pt-section"}>
            <Reveal>
              <h1 className="text-display-md md:text-display-lg font-medium max-w-[18ch] bg-gradient-to-b from-ink to-ink-subtle bg-clip-text text-transparent">
                The interview workspace for coding teams.
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-lg text-body-lg text-ink-subtle max-w-[48ch]">
                Editor, video, chat and AI hints in one room. Built for live
                technical interviews.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-10 flex flex-wrap items-center gap-md">
                <PrimaryLink to={cta}>{ctaLabel}</PrimaryLink>
                {!hasToken && <GhostLink to="/login">Sign in</GhostLink>}
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div
                className="mt-section rounded-xl border border-hairline bg-surface-1 overflow-hidden transition-transform duration-500 hover:-translate-y-1"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to bottom, #000 62%, transparent)",
                  maskImage:
                    "linear-gradient(to bottom, #000 62%, transparent)",
                }}
              >
                <img
                  src="/screenshots/room.png"
                  alt="An Intervue room with the problem panel, shared editor and console"
                  className="w-full block"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Built with */}
        <section className={W + " " + GAP}>
          <Reveal>
            <p className="text-body-sm text-ink-tertiary">Built with</p>
            <div className="mt-md flex flex-wrap gap-x-xxl gap-y-md text-body-lg font-medium text-ink-subtle">
              {BUILT_WITH.map(function (t, i) {
                return (
                  <span
                    key={t}
                    className="transition-all duration-300 hover:text-ink hover:-translate-y-0.5 inline-block"
                    style={{ transitionDelay: i * 20 + "ms" }}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* Statement */}
        <section className={W + " " + GAP}>
          <Reveal>
            <p className="text-headline md:text-display-md font-medium max-w-[34ch] md:max-w-[40ch] text-ink-subtle">
              <span className="text-ink">
                Interviews shouldn't need five tabs.{" "}
              </span>
              Intervue puts the editor, the call, the chat and the hints behind
              one link, so the conversation stays on the candidate's thinking.
            </p>
          </Reveal>
        </section>

        {/* Pillars */}
        <section className={W + " " + GAP + " grid md:grid-cols-3 gap-xxl"}>
          {PILLARS.map(function (p, i) {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={i * 90}>
                <div className="group transition-transform duration-300 ease-out hover:-translate-y-1.5">
                  <div className="w-12 h-12 rounded-lg border border-hairline bg-surface-1 flex items-center justify-center text-primary transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-[0_0_0_4px_rgba(94,106,210,0.12)] group-hover:scale-105">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-lg text-body font-medium transition-colors duration-300 group-hover:text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-xs text-body text-ink-subtle max-w-[36ch]">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </section>

        {/* Feature sections */}
        <div id="features">
          {SECTIONS.map(function (s, si) {
            return (
              <section key={s.id} className={W + " " + GAP}>
                <Reveal>
                  <div className="grid md:grid-cols-2 gap-xl md:gap-xxl items-start">
                    <h2 className="text-display-md font-medium">
                      {s.title[0]}
                      <br />
                      {s.title[1]}
                    </h2>
                    <div>
                      <p className="text-body-lg text-ink-subtle max-w-[44ch]">
                        {s.body}
                      </p>
                      <Link
                        to={cta}
                        className={
                          "group mt-lg inline-flex items-center gap-xs text-body-sm font-medium text-ink-muted hover:text-ink rounded" +
                          focus
                        }
                      >
                        Try it in a room
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          className="transition-transform duration-200 group-hover:translate-x-1"
                        />
                      </Link>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={120}>
                  <div className="mt-xxl">
                    {s.visual === "editor" ? (
                      <Frame className="hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(94,106,210,0.5)]">
                        <div className="p-lg md:p-xxl">
                          <div className="mx-auto max-w-[760px]">
                            <LiveEditor />
                          </div>
                        </div>
                      </Frame>
                    ) : (
                      <Frame className="hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] group">
                        <img
                          src={s.img}
                          alt={s.alt}
                          loading="lazy"
                          className="w-full block transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                        />
                      </Frame>
                    )}
                  </div>
                </Reveal>

                <Reveal delay={200}>
                  <div className="mt-xl pt-lg border-t border-hairline grid md:grid-cols-2 gap-md md:gap-xxl">
                    <span className="text-body-sm text-ink-tertiary">
                      Under the hood
                    </span>
                    <ul className="grid sm:grid-cols-2 gap-xs text-body-sm text-ink-muted list-none">
                      {s.facts.map(function (f) {
                        return (
                          <li
                            key={f}
                            className="transition-colors duration-200 hover:text-ink"
                          >
                            {f}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </Reveal>
              </section>
            );
          })}
        </div>

        {/* Final CTA */}
        <section className="border-t border-hairline">
          <div className={W + " py-section text-center"}>
            <Reveal>
              <h2 className="text-display-md font-medium">
                Run your next interview
                <br />
                in one room.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-xxl flex flex-wrap items-center justify-center gap-md">
                <PrimaryLink to={cta}>{ctaLabel}</PrimaryLink>
                <GhostLink
                  external
                  href="https://github.com/sahil78tt/intervue"
                >
                  View on GitHub
                </GhostLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div
          className={
            W + " py-xxl grid grid-cols-2 md:grid-cols-4 gap-xl text-body-sm"
          }
        >
          <div className="col-span-2 md:col-span-2">
            <span className="text-[18px] font-semibold tracking-tight">
              Intervue<span className="text-primary">.</span>
            </span>
            <p className="mt-md text-ink-tertiary max-w-[36ch]">
              Real-time coding interviews. Best on a desktop browser.
            </p>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-ink-tertiary">Product</span>
            <Link
              to="/dashboard"
              className="text-ink-muted hover:text-ink transition-colors duration-200 w-fit"
            >
              Dashboard
            </Link>
            <Link
              to="/login"
              className="text-ink-muted hover:text-ink transition-colors duration-200 w-fit"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-ink-muted hover:text-ink transition-colors duration-200 w-fit"
            >
              Create account
            </Link>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="text-ink-tertiary">Project</span>
            <a
              href="https://github.com/sahil78tt/intervue"
              target="_blank"
              rel="noreferrer"
              className="text-ink-muted hover:text-ink transition-colors duration-200 w-fit"
            >
              GitHub
            </a>
            <a
              href="https://github.com/sahil78tt"
              target="_blank"
              rel="noreferrer"
              className="text-ink-muted hover:text-ink transition-colors duration-200 w-fit"
            >
              Sahil Vishwakarma
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

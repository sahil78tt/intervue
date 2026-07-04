import { useEffect } from "react";

// ── HintModal ─────────────────────────────────────────────────────
// Centered overlay that shows AI-generated coding hints.
//
// Props:
//   isOpen      — boolean, controls visibility
//   isLoading   — boolean, show "thinking..." state
//   hint        — string, the AI response
//   error       — string, error message if API failed
//   onClose     — function, called when user closes modal
//   onRegenerate— function, called when user wants a new hint

function HintModal({ isOpen, isLoading, hint, error, onClose, onRegenerate }) {
  // Close on Escape key — small UX polish
  useEffect(
    function () {
      if (!isOpen) return;

      function handleEsc(e) {
        if (e.key === "Escape") onClose();
      }

      window.addEventListener("keydown", handleEsc);
      return function () {
        window.removeEventListener("keydown", handleEsc);
      };
    },
    [isOpen, onClose],
  );

  // Don't render at all when closed
  if (!isOpen) return null;

  return (
    // ── Backdrop ── dims everything behind, click to close ──
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      {/* ── Modal ── stopPropagation so clicking modal doesn't close it ── */}
      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        className="w-full max-w-[500px] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-100 uppercase tracking-widest font-medium">
              Hint
            </span>
            <span className="text-zinc-500 text-xs">✦</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
          >
            close
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-8 min-h-[160px] flex flex-col justify-center">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-zinc-400 font-mono">thinking...</p>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-300 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Success — show the hint */}
          {!isLoading && !error && hint && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {hint}
              </p>
            </div>
          )}

          {/* Empty (first open before request finishes) */}
          {!isLoading && !error && !hint && (
            <p className="text-sm text-zinc-500 font-mono">no hint yet.</p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="h-12 flex items-center justify-between px-6 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            powered by groq
          </span>
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="text-xs font-mono text-zinc-400 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150 disabled:opacity-30"
          >
            {error ? "retry" : "regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HintModal;

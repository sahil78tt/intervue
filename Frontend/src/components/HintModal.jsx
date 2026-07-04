import { useEffect } from "react";

function HintModal({ isOpen, isLoading, hint, error, onClose, onRegenerate }) {
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

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-semantic-overlay/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        className="w-full max-w-[400px] bg-canvas border border-hairline rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="h-11 flex items-center justify-between px-5 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-mono text-ink-tertiary uppercase tracking-widest">
              AI Hint
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[11px] text-ink-tertiary hover:text-ink transition-colors duration-150"
          >
            close
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-8 min-h-[140px] flex flex-col justify-center">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[13px] text-ink-subtle">
                Generating a hint...
              </p>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500/70 flex-shrink-0" />
                <p className="text-[12px] text-ink-subtle">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {!isLoading && !error && hint && (
            <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
              {hint}
            </p>
          )}

          {/* Empty */}
          {!isLoading && !error && !hint && (
            <p className="text-[13px] text-ink-subtle text-center">
              No hint generated yet.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 flex items-center justify-between px-5 border-t border-hairline">
          <span className="text-[10px] font-mono text-ink-tertiary tracking-wider">
            powered by groq
          </span>
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="text-[13px] text-ink-subtle font-medium hover:text-ink transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {error ? "retry" : "regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HintModal;

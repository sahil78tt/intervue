import { useEffect } from "react";

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  isLoading,
}) {
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        className="w-full max-w-[440px] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="h-12 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
            <span className="text-xs font-mono text-zinc-100 uppercase tracking-widest font-medium">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
          >
            close
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        <div className="h-12 flex items-center justify-end gap-3 px-6 border-t border-white/5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150 disabled:opacity-30"
          >
            cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500/10 px-4 py-1.5 rounded-full transition-colors duration-150 disabled:opacity-30"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
            {isLoading ? "deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

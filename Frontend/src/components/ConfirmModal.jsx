import { useEffect, useState } from "react";

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  isLoading,
}) {
  var [fadeClass, setFadeClass] = useState("opacity-0 scale-95");

  useEffect(
    function () {
      if (isOpen) {
        var timer = setTimeout(function () {
          setFadeClass("opacity-100 scale-100");
        }, 50);
        return function () {
          clearTimeout(timer);
        };
      } else {
        setFadeClass("opacity-0 scale-95");
      }
    },
    [isOpen],
  );

  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-sans"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-none" />

      {/* Modal */}
      <div
        className={
          "relative w-full max-w-[380px] bg-surface-1 border border-hairline rounded-xl transition-all duration-300 ease-out " +
          fadeClass
        }
      >
        <div className="p-6">
          {/* Header with red dot */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <h2 className="text-[11px] font-medium text-ink-subtle uppercase tracking-widest font-sans">
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-[14px] text-ink font-sans leading-relaxed whitespace-pre-wrap mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[14px] font-medium font-sans py-3 rounded-full border border-red-500/20 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Deleting..." : confirmLabel || "Confirm"}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-ink-subtle hover:text-ink text-[13px] font-medium font-sans py-2 transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

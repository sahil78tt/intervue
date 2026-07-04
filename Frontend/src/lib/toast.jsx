import { toast as sonnerToast } from "sonner";

function ToastContent({ dotClassName, label, message, spinner }) {
  return (
    <div className="flex items-start gap-3 w-full">
      {/* Dot or spinner */}
      {spinner ? (
        <div className="mt-1.5 w-1.5 h-1.5">
          <div className="w-1.5 h-1.5 rounded-full border border-zinc-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div
          className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClassName}`}
        />
      )}

      {/* Text */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-[10px] font-mono text-zinc-100 uppercase tracking-widest font-medium">
          {label}
        </span>
        {message && (
          <span className="text-xs text-zinc-400 leading-relaxed">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

export function toastSuccess(label, message) {
  return sonnerToast.custom(
    function () {
      return (
        <ToastContent
          dotClassName="bg-green-500"
          label={label}
          message={message}
        />
      );
    },
    { duration: 2500 },
  );
}

export function toastError(label, message) {
  return sonnerToast.custom(
    function () {
      return (
        <ToastContent
          dotClassName="bg-red-500/70"
          label={label}
          message={message}
        />
      );
    },
    { duration: 5000 },
  );
}

export function toastWarning(label, message) {
  return sonnerToast.custom(
    function () {
      return (
        <ToastContent
          dotClassName="bg-amber-500"
          label={label}
          message={message}
        />
      );
    },
    { duration: 4000 },
  );
}

export function toastInfo(label, message) {
  return sonnerToast.custom(
    function () {
      return (
        <ToastContent
          dotClassName="bg-sky-500"
          label={label}
          message={message}
        />
      );
    },
    { duration: 3000 },
  );
}

export function toastLoading(label, message) {
  return sonnerToast.custom(
    function () {
      return <ToastContent spinner={true} label={label} message={message} />;
    },
    { duration: Infinity },
  );
}

export function toastDismiss(id) {
  sonnerToast.dismiss(id);
}


import { useToastStore, type ToastType } from "@/store/toast-store";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-accent-green/10",
    border: "border-accent-green/30",
    icon: "text-accent-green",
  },
  error: {
    bg: "bg-accent-red/10",
    border: "border-accent-red/30",
    icon: "text-accent-red",
  },
  info: {
    bg: "bg-accent-blue/10",
    border: "border-accent-blue/30",
    icon: "text-accent-blue",
  },
  warning: {
    bg: "bg-accent-amber/10",
    border: "border-accent-amber/30",
    icon: "text-accent-amber",
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        const color = colors[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border ${color.bg} ${color.border} p-4 backdrop-blur-xl shadow-lg animate-slide-in`}
          >
            <div className="flex items-start gap-3">
              <Icon size={18} className={`shrink-0 mt-0.5 ${color.icon}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

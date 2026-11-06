import { api } from "./api";
import { toast } from "sonner";

export const APP_STATUSES = [
  { value: "saved", label: "Saved", cls: "bg-white" },
  { value: "applied", label: "Applied", cls: "bg-[#FFD100]" },
  { value: "interviewed", label: "Interviewed", cls: "bg-[#0055A4] text-white" },
  { value: "hired", label: "Hired", cls: "bg-[#1DB954] text-white" },
];

export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function ClosingBadge({ deadline, testId }) {
  const days = daysUntil(deadline);
  if (days === null || days < 0 || days > 7) return null;
  const text = days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : "Closes this week";
  return (
    <span data-testid={testId} className="bg-[#FF3B30] text-white brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase inline-flex items-center gap-1">
      {text}
    </span>
  );
}

export function StatusSelect({ value, kind, id, onChange, testId }) {
  const current = APP_STATUSES.find((s) => s.value === value) || APP_STATUSES[0];
  async function change(e) {
    const status = e.target.value;
    try {
      await api.patch(`/saved/${kind}/${encodeURIComponent(id)}/status`, { status });
      onChange(status);
      toast.success(status === "hired" ? "Congrats — marked as hired!" : `Marked as ${status}`);
    } catch {
      toast.error("Couldn't update status");
    }
  }
  return (
    <select
      value={value || "saved"}
      onChange={change}
      data-testid={testId}
      aria-label="Application status"
      className={`brutal-border px-2 py-1 font-display font-black text-[11px] uppercase cursor-pointer ${current.cls}`}
    >
      {APP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

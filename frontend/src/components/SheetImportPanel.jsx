import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Sheet, RefreshCw, Link2 } from "lucide-react";

export default function SheetImportPanel({ onImported }) {
  const [url, setUrl] = useState("");
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function load() { api.get("/admin/listings/import-settings").then((r) => { setSettings(r.data); if (r.data.sheet_url) setUrl(r.data.sheet_url); }).catch(() => {}); }
  useEffect(load, []);

  async function run() {
    if (!url.trim()) return toast.error("Paste the Google Sheet link first");
    setBusy(true); setResult(null);
    try {
      const { data } = await api.post("/admin/listings/import-sheet", { sheet_url: url.trim(), save: true });
      setResult(data);
      toast.success(`${data.imported} new submission${data.imported !== 1 ? "s" : ""} added as pending`);
      load(); onImported?.();
    } catch (e) { toast.error(e.response?.data?.detail || "Import failed"); }
    finally { setBusy(false); }
  }

  return (
    <div data-testid="sheet-import-panel" className="brutal-border brutal-shadow bg-[#FFD100] p-5 lg:col-span-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-black text-xl flex items-center gap-2"><Sheet size={18} strokeWidth={3} />Google Form auto-import</h3>
          <p className="text-sm text-black/75 mt-1 max-w-2xl">In Google Forms open <b>Responses → Link to Sheets</b>, then in that Sheet choose <b>File → Share → Publish to web → CSV</b> (or share "Anyone with the link can view") and paste the link here. New rows become <b>pending</b> listings for you to review — checked every hour automatically.</p>
        </div>
        {settings?.last_run && (
          <p data-testid="sheet-import-last-run" className="text-xs font-bold bg-white brutal-border px-2 py-1">
            Last check {new Date(settings.last_run).toLocaleString()}{settings.last_result ? ` · +${settings.last_result.imported} new` : ""}{settings.last_error ? ` · ⚠ ${settings.last_error}` : ""}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Link2 size={16} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} data-testid="sheet-import-url" placeholder="https://docs.google.com/spreadsheets/d/…"
            className="w-full bg-white brutal-border pl-9 pr-3 py-2.5 text-sm focus:outline-none" />
        </div>
        <button onClick={run} disabled={busy} data-testid="sheet-import-run" className="bg-black text-white brutal-border brutal-shadow-sm brutal-press px-4 py-2.5 font-display font-bold text-xs uppercase inline-flex items-center justify-center gap-2 disabled:opacity-60">
          <RefreshCw size={14} strokeWidth={3} className={busy ? "animate-spin" : ""} />{busy ? "Importing…" : settings?.sheet_url ? "Save & import now" : "Connect & import"}
        </button>
      </div>
      {result && (
        <p data-testid="sheet-import-result" className="mt-2 text-xs font-bold">
          {result.total_rows} response{result.total_rows !== 1 ? "s" : ""} read · {result.imported} added as pending · {result.skipped} already listed / empty · columns matched: {Object.keys(result.columns || {}).join(", ") || "none"}
        </p>
      )}
    </div>
  );
}

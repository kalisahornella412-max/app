import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Download, Share2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

const SITE = "halifaxyouthhub.com";

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(" "); let line = ""; let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
  return yy + lh;
}

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

export default function ShareWinDialog({ open, onOpenChange, job, name }) {
  const [style, setStyle] = useState("yellow");
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (!open || !job) return;
    let cancelled = false;
    (async () => {
      const c = document.createElement("canvas"); const ctx = c.getContext("2d");
      const W = 1080, H = 1080; c.width = W; c.height = H;
      const palette = style === "yellow" ? { bg: "#FFD100", fg: "#000", accent: "#000", card: "#fff" } : { bg: "#000", fg: "#fff", accent: "#FFD100", card: "#111" };
      ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);
      // dotted grid texture
      ctx.fillStyle = style === "yellow" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
      for (let x = 40; x < W; x += 40) for (let y = 40; y < H; y += 40) ctx.fillRect(x, y, 4, 4);
      // card
      ctx.fillStyle = palette.card; ctx.fillRect(90, 190, 900, 700);
      ctx.lineWidth = 8; ctx.strokeStyle = palette.accent; ctx.strokeRect(90, 190, 900, 700);
      ctx.fillStyle = palette.accent; ctx.fillRect(110, 210, 900, 700); // shadow
      ctx.fillStyle = palette.card; ctx.fillRect(90, 190, 900, 700); ctx.strokeRect(90, 190, 900, 700);
      // logo
      try { const logo = await loadImg("/brand/icon-512.png"); ctx.drawImage(logo, 90, 70, 96, 96); } catch {}
      ctx.fillStyle = palette.fg; ctx.font = "900 44px 'Space Grotesk', Arial, sans-serif"; ctx.textBaseline = "top";
      ctx.fillText("HALIFAX YOUTH HUB", 206, 94);
      // tag
      ctx.fillStyle = palette.accent; ctx.fillRect(140, 240, 260, 48);
      ctx.fillStyle = style === "yellow" ? "#FFD100" : "#000"; ctx.font = "900 26px Arial, sans-serif"; ctx.fillText("★  I GOT HIRED", 160, 251);
      // headline
      ctx.fillStyle = style === "yellow" ? "#000" : "#fff"; ctx.font = "900 86px 'Space Grotesk', Arial, sans-serif";
      let y = wrap(ctx, job.title, 140, 320, 800, 92);
      ctx.font = "700 42px Arial, sans-serif"; ctx.fillStyle = "#0055A4";
      if (job.employer) y = wrap(ctx, `at ${job.employer}`, 140, y + 10, 800, 50);
      ctx.fillStyle = style === "yellow" ? "#333" : "#ccc"; ctx.font = "500 32px Arial, sans-serif";
      wrap(ctx, `${name ? name.split(" ")[0] + " found" : "Found"} this role through the Halifax Youth Hub job board — resume, cover letter and interview prep all in one place.`, 140, Math.min(y + 30, 700), 800, 42);
      // footer
      ctx.fillStyle = palette.fg; ctx.font = "900 34px Arial, sans-serif"; ctx.fillText(SITE, 90, 940);
      ctx.font = "700 26px Arial, sans-serif"; ctx.fillStyle = style === "yellow" ? "#333" : "#aaa"; ctx.fillText("Programs · Jobs · Community · Resume builder for Halifax youth & newcomers", 90, 990);
      if (!cancelled) setDataUrl(c.toDataURL("image/png"));
    })();
    return () => { cancelled = true; };
  }, [open, job, style, name]);

  function download() {
    const a = document.createElement("a"); a.href = dataUrl; a.download = `hired-${(job.title || "win").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`; a.click();
  }
  async function share() {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "halifax-youth-hub-win.png", { type: "image/png" });
      const text = `I got hired as ${job.title}${job.employer ? ` at ${job.employer}` : ""}! Found it on Halifax Youth Hub — ${SITE}`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      await navigator.clipboard.writeText(text); download();
      toast.success("Image downloaded and caption copied — paste it into your post");
    } catch (e) { if (e?.name !== "AbortError") toast.error("Sharing isn't available here — use Download instead"); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="share-win-dialog" className="brutal-border brutal-shadow bg-white rounded-none max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-2xl tracking-tighter flex items-center gap-2"><PartyPopper size={20} strokeWidth={3} />Share your win</DialogTitle>
          <DialogDescription>A ready-to-post card for Instagram or LinkedIn. Pick a style, download or share.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {["yellow", "black"].map((s) => (
            <button key={s} onClick={() => setStyle(s)} data-testid={`share-style-${s}`} className={`brutal-border px-3 py-1.5 font-display font-bold text-xs uppercase ${style === s ? "bg-[#FFD100]" : "bg-white"}`}>{s === "yellow" ? "Yellow" : "Black"}</button>
          ))}
        </div>
        {dataUrl && <img src={dataUrl} alt="Your hired card" data-testid="share-win-preview" className="w-full brutal-border" />}
        <div className="flex flex-wrap gap-2">
          <button onClick={download} disabled={!dataUrl} data-testid="share-win-download" className="bg-black text-white brutal-border brutal-press px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-50"><Download size={12} strokeWidth={3} />Download PNG</button>
          <button onClick={share} disabled={!dataUrl} data-testid="share-win-share" className="bg-[#0055A4] text-white brutal-border brutal-press px-3 py-2 font-display font-bold text-xs uppercase inline-flex items-center gap-1 disabled:opacity-50"><Share2 size={12} strokeWidth={3} />Share…</button>
        </div>
        <p className="text-[11px] text-black/60">Tip: tag @ the employer and use #HalifaxYouthHub so we can celebrate you.</p>
      </DialogContent>
    </Dialog>
  );
}

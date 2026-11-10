import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Star, StarOff, CheckCircle2, EyeOff, X, Instagram } from "lucide-react";
import SheetImportPanel from "./SheetImportPanel";

const EMPTY = { slug: "", name: "", category: "", short_description: "", description: "", image_url: "", instagram: "", website: "", contact: "", neighbourhood: "All HRM", booking_url: "", tags: [], is_featured: false, status: "approved" };

export default function CommunityAdmin() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [l, c] = await Promise.all([api.get("/admin/listings"), api.get("/listings/categories")]);
    setItems(l.data); setCategories(c.data);
    setForm((f) => (f.category ? f : { ...f, category: c.data[0] || "" }));
  }
  useEffect(() => { reload(); }, []);

  function startEdit(l) {
    setEditing(l.id);
    setForm({ ...EMPTY, ...l, tags: l.tags || [], instagram: l.instagram || "", website: l.website || "", contact: l.contact || "", booking_url: l.booking_url || "", image_url: l.image_url || "", description: l.description || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() { setEditing(null); setForm({ ...EMPTY, category: categories[0] || "" }); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, slug: form.slug || undefined, tags: Array.isArray(form.tags) ? form.tags : String(form.tags).split(",").map((t) => t.trim()).filter(Boolean) };
    try {
      if (editing) { await api.put(`/listings/${editing}`, payload); toast.success("Listing updated"); }
      else { await api.post("/listings", payload); toast.success("Listing created"); }
      cancelEdit(); reload();
    } catch (err) { toast.error(err.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  }

  async function patch(l, body, msg) {
    try { await api.patch(`/listings/${l.id}`, body); toast.success(msg); reload(); }
    catch { toast.error("Update failed"); }
  }
  async function del(l) {
    if (!window.confirm(`Remove "${l.name}" from the directory?`)) return;
    await api.delete(`/listings/${l.id}`); toast.success("Removed"); reload();
  }

  const shown = items.filter((l) => filter === "all" ? true : filter === "pending" ? l.status === "pending" : l.category === filter);
  const pendingCount = items.filter((l) => l.status === "pending").length;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <SheetImportPanel onImported={reload} />
      <form onSubmit={submit} data-testid="admin-listing-form" className="brutal-border brutal-shadow bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black text-xl flex items-center gap-2">{editing ? <Pencil size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}{editing ? "Edit Listing" : "Add Listing"}</h3>
          {editing && <button type="button" onClick={cancelEdit} data-testid="admin-listing-cancel" className="text-xs font-bold uppercase inline-flex items-center gap-1 hover:bg-[#F4F4F4] px-2 py-1"><X size={12} strokeWidth={3} />Cancel</button>}
        </div>
        <F label="Business / organization name *" v={form.name} on={(v) => setForm({ ...form, name: v })} testId="admin-listing-name" />
        <div>
          <label className="label-overline">Category *</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="admin-listing-category" className="mt-1 w-full bg-white brutal-border px-3 py-2 text-sm font-bold">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <F label="Short description * (shown on cards)" v={form.short_description} on={(v) => setForm({ ...form, short_description: v })} testId="admin-listing-short" />
        <F label="Full description (optional)" v={form.description} on={(v) => setForm({ ...form, description: v })} as="textarea" />
        <F label="Logo / profile / cover image URL" v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} placeholder="https://…" />
        <div className="grid grid-cols-2 gap-3">
          <F label="Instagram username or URL" v={form.instagram} on={(v) => setForm({ ...form, instagram: v })} placeholder="@handle" testId="admin-listing-instagram" />
          <F label="Website (optional)" v={form.website} on={(v) => setForm({ ...form, website: v })} placeholder="https://…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Contact (phone or email, optional)" v={form.contact} on={(v) => setForm({ ...form, contact: v })} />
          <F label="Neighbourhood / service area" v={form.neighbourhood} on={(v) => setForm({ ...form, neighbourhood: v })} />
        </div>
        <F label="Booking / ordering / registration link (optional)" v={form.booking_url} on={(v) => setForm({ ...form, booking_url: v })} placeholder="https://…" />
        <F label="Tags (comma separated)" v={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags} on={(v) => setForm({ ...form, tags: v })} />
        <F label="Slug (optional — auto from name)" v={form.slug} on={(v) => setForm({ ...form, slug: v })} />
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} data-testid="admin-listing-featured" />Featured</label>
          <label className="inline-flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.status === "approved"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "approved" : "pending" })} data-testid="admin-listing-approved" />Published (unchecked = pending review)</label>
        </div>
        <button type="submit" disabled={saving} data-testid="admin-listing-save" className="w-full bg-[#FFD100] brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Create listing"}</button>
      </form>

      <div className="brutal-border brutal-shadow bg-white p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="font-display font-black text-xl">Listings ({items.length}){pendingCount > 0 && <span className="ml-2 bg-[#FF3B30] text-white brutal-border px-2 py-0.5 text-xs align-middle" data-testid="admin-pending-count">{pendingCount} pending</span>}</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="admin-listing-filter" className="bg-white brutal-border px-2 py-1 text-xs font-bold uppercase">
            <option value="all">All</option>
            <option value="pending">Pending review</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-[720px] overflow-y-auto">
          {shown.map((l) => (
            <div key={l.id} data-testid={`admin-listing-${l.slug}`} className={`brutal-border p-3 flex items-center gap-3 ${l.status === "pending" ? "bg-[#FFF3C4]" : "bg-[#F4F4F4]"}`}>
              <div className="w-12 h-12 brutal-border bg-white overflow-hidden shrink-0">{l.image_url && <img src={l.image_url} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold truncate">{l.name} {l.is_featured && <Star size={12} strokeWidth={3} className="inline text-[#0055A4]" />}</p>
                <p className="text-xs text-black/60 truncate">{l.category}{l.instagram ? <> · <Instagram size={10} className="inline" /> @{l.instagram}</> : ""} · <span className={l.status === "pending" ? "text-[#FF3B30] font-bold" : ""}>{l.status}</span></p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => patch(l, { status: l.status === "approved" ? "pending" : "approved" }, l.status === "approved" ? "Unpublished" : "Approved & published")} data-testid={`admin-listing-toggle-status-${l.slug}`} title={l.status === "approved" ? "Unpublish" : "Approve"} className={`brutal-border p-2 ${l.status === "approved" ? "bg-white" : "bg-[#1DB954] text-white"}`}>{l.status === "approved" ? <EyeOff size={14} strokeWidth={3} /> : <CheckCircle2 size={14} strokeWidth={3} />}</button>
                <button onClick={() => patch(l, { is_featured: !l.is_featured }, l.is_featured ? "Unfeatured" : "Featured")} data-testid={`admin-listing-toggle-featured-${l.slug}`} title="Feature" className={`brutal-border p-2 ${l.is_featured ? "bg-[#FFD100]" : "bg-white"}`}>{l.is_featured ? <StarOff size={14} strokeWidth={3} /> : <Star size={14} strokeWidth={3} />}</button>
                <button onClick={() => startEdit(l)} data-testid={`admin-listing-edit-${l.slug}`} title="Edit" className="bg-[#0055A4] text-white brutal-border p-2"><Pencil size={14} strokeWidth={3} /></button>
                <button onClick={() => del(l)} data-testid={`admin-listing-delete-${l.slug}`} title="Remove" className="bg-[#FF3B30] text-white brutal-border p-2"><Trash2 size={14} strokeWidth={3} /></button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm text-black/60">No listings match.</p>}
        </div>
      </div>
    </div>
  );
}

function F({ label, v, on, as, placeholder, testId }) {
  const cls = "mt-1 w-full bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-[#FFFCEA]";
  return (
    <div>
      <label className="label-overline">{label}</label>
      {as === "textarea"
        ? <textarea value={v || ""} onChange={(e) => on(e.target.value)} rows={4} placeholder={placeholder} data-testid={testId} className={cls} />
        : <input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={placeholder} data-testid={testId} className={cls} />}
    </div>
  );
}

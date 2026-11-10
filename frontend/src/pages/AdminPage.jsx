import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import CommunityAdmin from "../components/CommunityAdmin";
import BackButton from "../components/BackButton";

export default function AdminPage() {
  const [tab, setTab] = useState("programs");
  const [programs, setPrograms] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);

  async function reload() {
    const [p, j, e] = await Promise.all([api.get("/programs"), api.get("/jobs"), api.get("/events")]);
    setPrograms(p.data); setJobs(j.data); setEvents(e.data);
  }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="admin-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#FF3B30] text-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <BackButton />
          <span className="label-overline">/ Admin</span>
          <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl mt-1">Manage content.</h1>
          <div className="mt-6 flex gap-2 flex-wrap">
            {["programs", "jobs", "events", "community"].map((t) => (
              <button key={t} onClick={() => setTab(t)} data-testid={`admin-tab-${t}`}
                className={`brutal-border brutal-shadow-sm brutal-press px-4 py-2 font-display font-bold uppercase text-sm ${tab === t ? "bg-[#FFD100] text-black" : "bg-white text-black"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {tab === "programs" && <ProgramsAdmin items={programs} reload={reload} />}
        {tab === "jobs" && <JobsAdmin items={jobs} reload={reload} />}
        {tab === "events" && <EventsAdmin items={events} reload={reload} />}
        {tab === "community" && <CommunityAdmin />}
      </section>
    </div>
  );
}

function ProgramsAdmin({ items, reload }) {
  const [form, setForm] = useState({ slug: "", name: "", organization: "", category: "Employment & Training", age_min: 14, age_max: 24, neighbourhood: "All HRM", short_description: "", description: "", apply_url: "", image_url: "", tags: [], is_featured: false });
  async function submit(e) {
    e.preventDefault();
    try { await api.post("/programs", form); toast.success("Created"); reload();
      setForm({ ...form, slug: "", name: "", short_description: "", description: "" });
    } catch (e) { toast.error("Failed (slug must be unique)"); }
  }
  async function del(id) { if (!window.confirm("Delete?")) return; await api.delete(`/programs/${id}`); reload(); toast.success("Deleted"); }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="brutal-border brutal-shadow bg-white p-5 space-y-3">
        <h3 className="font-display font-black text-xl flex items-center gap-2"><Plus size={18} strokeWidth={3} />Add Program</h3>
        <Field label="Slug" v={form.slug} on={(v) => setForm({ ...form, slug: v })} />
        <Field label="Name" v={form.name} on={(v) => setForm({ ...form, name: v })} />
        <Field label="Organization" v={form.organization} on={(v) => setForm({ ...form, organization: v })} />
        <Field label="Category" v={form.category} on={(v) => setForm({ ...form, category: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age min" v={form.age_min} on={(v) => setForm({ ...form, age_min: parseInt(v) || 0 })} type="number" />
          <Field label="Age max" v={form.age_max} on={(v) => setForm({ ...form, age_max: parseInt(v) || 0 })} type="number" />
        </div>
        <Field label="Neighbourhood" v={form.neighbourhood} on={(v) => setForm({ ...form, neighbourhood: v })} />
        <Field label="Short description" v={form.short_description} on={(v) => setForm({ ...form, short_description: v })} />
        <Field label="Description" v={form.description} on={(v) => setForm({ ...form, description: v })} as="textarea" />
        <Field label="Image URL" v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} />
        <Field label="Apply URL" v={form.apply_url} on={(v) => setForm({ ...form, apply_url: v })} />
        <button type="submit" data-testid="admin-program-create" className="w-full bg-[#FFD100] brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase">Create</button>
      </form>
      <div className="brutal-border brutal-shadow bg-white p-5">
        <h3 className="font-display font-black text-xl mb-3">All Programs ({items.length})</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {items.map((p) => (
            <div key={p.id} className="brutal-border bg-[#F4F4F4] p-3 flex items-center justify-between gap-3">
              <div><p className="font-display font-bold">{p.name}</p><p className="text-xs text-black/60">{p.slug} · {p.category}</p></div>
              <button onClick={() => del(p.id)} className="bg-[#FF3B30] text-white brutal-border p-2"><Trash2 size={14} strokeWidth={3} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobsAdmin({ items, reload }) {
  const [form, setForm] = useState({ title: "", employer: "", category: "Summer Jobs", location: "Halifax, NS", wage: "", type: "Part-time", age_min: 16, short_description: "", description: "", apply_url: "", deadline: "", tags: [] });
  async function submit(e) {
    e.preventDefault();
    try { await api.post("/jobs", form); toast.success("Created"); reload();
      setForm({ ...form, title: "", employer: "", short_description: "", description: "" });
    } catch (e) { toast.error("Failed"); }
  }
  async function del(id) { if (!window.confirm("Delete?")) return; await api.delete(`/jobs/${id}`); reload(); toast.success("Deleted"); }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="brutal-border brutal-shadow bg-white p-5 space-y-3">
        <h3 className="font-display font-black text-xl flex items-center gap-2"><Plus size={18} strokeWidth={3} />Add Job</h3>
        <Field label="Title" v={form.title} on={(v) => setForm({ ...form, title: v })} />
        <Field label="Employer" v={form.employer} on={(v) => setForm({ ...form, employer: v })} />
        <Field label="Category" v={form.category} on={(v) => setForm({ ...form, category: v })} />
        <Field label="Location" v={form.location} on={(v) => setForm({ ...form, location: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wage" v={form.wage} on={(v) => setForm({ ...form, wage: v })} />
          <Field label="Type" v={form.type} on={(v) => setForm({ ...form, type: v })} />
        </div>
        <Field label="Short description" v={form.short_description} on={(v) => setForm({ ...form, short_description: v })} />
        <Field label="Description" v={form.description} on={(v) => setForm({ ...form, description: v })} as="textarea" />
        <Field label="Apply URL" v={form.apply_url} on={(v) => setForm({ ...form, apply_url: v })} />
        <Field label="Deadline (ISO)" v={form.deadline} on={(v) => setForm({ ...form, deadline: v })} />
        <button type="submit" data-testid="admin-job-create" className="w-full bg-[#FFD100] brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase">Create</button>
      </form>
      <div className="brutal-border brutal-shadow bg-white p-5">
        <h3 className="font-display font-black text-xl mb-3">All Jobs ({items.length})</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {items.map((j) => (
            <div key={j.id} className="brutal-border bg-[#F4F4F4] p-3 flex items-center justify-between gap-3">
              <div><p className="font-display font-bold">{j.title}</p><p className="text-xs text-black/60">{j.employer} · {j.category}</p></div>
              <button onClick={() => del(j.id)} className="bg-[#FF3B30] text-white brutal-border p-2"><Trash2 size={14} strokeWidth={3} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsAdmin({ items, reload }) {
  const [form, setForm] = useState({ title: "", host: "", category: "Workshop", location: "Halifax", starts_at: "", duration_minutes: 90, description: "", image_url: "" });
  async function submit(e) {
    e.preventDefault();
    try { await api.post("/events", form); toast.success("Created"); reload(); setForm({ ...form, title: "", description: "" }); }
    catch (e) { toast.error("Failed"); }
  }
  async function del(id) { if (!window.confirm("Delete?")) return; await api.delete(`/events/${id}`); reload(); toast.success("Deleted"); }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="brutal-border brutal-shadow bg-white p-5 space-y-3">
        <h3 className="font-display font-black text-xl flex items-center gap-2"><Plus size={18} strokeWidth={3} />Add Event</h3>
        <Field label="Title" v={form.title} on={(v) => setForm({ ...form, title: v })} />
        <Field label="Host" v={form.host} on={(v) => setForm({ ...form, host: v })} />
        <Field label="Category" v={form.category} on={(v) => setForm({ ...form, category: v })} />
        <Field label="Location" v={form.location} on={(v) => setForm({ ...form, location: v })} />
        <Field label="Starts at (ISO 8601)" v={form.starts_at} on={(v) => setForm({ ...form, starts_at: v })} placeholder="2026-06-01T18:00:00Z" />
        <Field label="Duration (min)" v={form.duration_minutes} on={(v) => setForm({ ...form, duration_minutes: parseInt(v) || 60 })} type="number" />
        <Field label="Description" v={form.description} on={(v) => setForm({ ...form, description: v })} as="textarea" />
        <Field label="Image URL" v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} />
        <button type="submit" data-testid="admin-event-create" className="w-full bg-[#FFD100] brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase">Create</button>
      </form>
      <div className="brutal-border brutal-shadow bg-white p-5">
        <h3 className="font-display font-black text-xl mb-3">All Events ({items.length})</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {items.map((j) => (
            <div key={j.id} className="brutal-border bg-[#F4F4F4] p-3 flex items-center justify-between gap-3">
              <div><p className="font-display font-bold">{j.title}</p><p className="text-xs text-black/60">{new Date(j.starts_at).toLocaleString()}</p></div>
              <button onClick={() => del(j.id)} className="bg-[#FF3B30] text-white brutal-border p-2"><Trash2 size={14} strokeWidth={3} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on, type = "text", as, placeholder }) {
  return (
    <div>
      <label className="label-overline">{label}</label>
      {as === "textarea" ? (
        <textarea value={v || ""} onChange={(e) => on(e.target.value)} rows={4} placeholder={placeholder}
          className="mt-1 w-full bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-[#FFFCEA]" />
      ) : (
        <input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full bg-white brutal-border px-3 py-2 text-sm focus:outline-none focus:bg-[#FFFCEA]" />
      )}
    </div>
  );
}

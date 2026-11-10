import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Globe, MapPin, Phone, CalendarCheck, Star, Instagram } from "lucide-react";
import { CATEGORY_COLORS, InstagramLink } from "../components/ListingCard";
import BackButton from "../components/BackButton";
import { SUBMIT_FORM_URL } from "./CommunityPage";

export default function ListingDetailPage() {
  const { id } = useParams();
  const [l, setL] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { api.get(`/listings/${id}`).then((r) => setL(r.data)).catch(() => setError(true)); }, [id]);

  if (error) return <div className="max-w-screen-md mx-auto px-4 py-20 text-center"><p className="font-display font-black text-2xl">Listing not found.</p><Link to="/community" className="underline font-bold mt-2 inline-block">Back to the directory</Link></div>;
  if (!l) return <div className="max-w-screen-md mx-auto px-4 py-20 font-mono-d text-sm">Loading…</div>;

  const isTel = l.contact && /^[+\d][\d\s().-]{6,}$/.test(l.contact);
  const isMail = l.contact && /@/.test(l.contact);

  return (
    <div data-testid="listing-detail-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <BackButton fallback="/community" />
          <Link to={`/community?category=${encodeURIComponent(l.category)}`} className={`inline-block brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase ${CATEGORY_COLORS[l.category] || "bg-white"}`}>{l.category}</Link>
          <h1 className="font-display font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl mt-3">{l.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            {l.neighbourhood && <span className="bg-white brutal-border px-2 py-1 inline-flex items-center gap-1"><MapPin size={12} strokeWidth={3} />{l.neighbourhood}</span>}
            {l.instagram && <span className="bg-white brutal-border px-2 py-1 inline-flex items-center gap-1"><Instagram size={12} strokeWidth={3} />@{l.instagram}</span>}
            {l.is_featured && <span className="bg-[#FFD100] brutal-border px-2 py-1 inline-flex items-center gap-1"><Star size={12} strokeWidth={3} />Featured</span>}
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          {l.image_url && (
            <div className="brutal-border brutal-shadow overflow-hidden bg-[#F4F4F4] aspect-[16/10]">
              <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
            </div>
          )}
          <p className="mt-6 text-lg font-medium leading-relaxed">{l.short_description}</p>
          {l.description && <p className="mt-4 text-black/80 leading-relaxed whitespace-pre-line">{l.description}</p>}
          {(l.tags || []).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">{l.tags.map((t) => <span key={t} className="text-xs font-bold bg-[#F4F4F4] brutal-border px-2 py-0.5">#{t}</span>)}</div>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="brutal-border brutal-shadow bg-[#FFD100] p-6 space-y-3 lg:sticky lg:top-24">
            <p className="label-overline">Connect</p>
            {l.instagram_url ? (
              <InstagramLink listing={l} className="w-full justify-center !py-3 !text-sm" testId="listing-detail-instagram" />
            ) : (
              <p className="text-sm font-bold text-black/70">No Instagram listed.</p>
            )}
            {l.website && (
              <a href={l.website} target="_blank" rel="noreferrer" data-testid="listing-detail-website" className="w-full bg-white brutal-border brutal-shadow-sm brutal-press px-3 py-3 font-display font-bold text-sm uppercase inline-flex items-center justify-center gap-2"><Globe size={14} strokeWidth={3} />Website</a>
            )}
            {l.booking_url && (
              <a href={l.booking_url} target="_blank" rel="noreferrer" data-testid="listing-detail-booking" className="w-full bg-[#0055A4] text-white brutal-border brutal-shadow-sm brutal-press px-3 py-3 font-display font-bold text-sm uppercase inline-flex items-center justify-center gap-2"><CalendarCheck size={14} strokeWidth={3} />Book / Order / Register</a>
            )}
            {l.contact && (
              <p data-testid="listing-detail-contact" className="text-sm font-bold inline-flex items-center gap-2 pt-1">
                <Phone size={14} strokeWidth={3} />
                {isTel ? <a href={`tel:${l.contact.replace(/[^\d+]/g, "")}`} className="underline">{l.contact}</a>
                  : isMail ? <a href={`mailto:${l.contact}`} className="underline">{l.contact}</a> : l.contact}
              </p>
            )}
            <p className="text-[11px] text-black/70 pt-2 border-t-2 border-black/20">Community-submitted listing. Is this yours and something's wrong? <a href={SUBMIT_FORM_URL} target="_blank" rel="noreferrer" className="underline font-bold">Request an edit</a>.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

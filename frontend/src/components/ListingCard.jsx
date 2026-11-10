import { Link } from "react-router-dom";
import { Instagram, Globe, MapPin, Star } from "lucide-react";

export const CATEGORY_COLORS = {
  "Beauty & Personal Care": "bg-[#FF3B30] text-white",
  "Photography & Creative Services": "bg-[#0055A4] text-white",
  "Restaurants & Food Businesses": "bg-[#FFD100]",
  "Arts & Creative Communities": "bg-black text-white",
  "Faith & Spiritual Communities": "bg-white",
};

export function InstagramLink({ listing, className = "", testId }) {
  if (!listing.instagram_url) return null;
  return (
    <a href={listing.instagram_url} target="_blank" rel="noreferrer" data-testid={testId}
      onClick={(e) => e.stopPropagation()}
      className={`bg-black text-white brutal-border brutal-shadow-sm brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase inline-flex items-center gap-1.5 ${className}`}>
      <Instagram size={14} strokeWidth={3} />View Instagram
    </a>
  );
}

export default function ListingCard({ l }) {
  return (
    <div data-testid={`listing-card-${l.slug}`} className="brutal-border brutal-shadow bg-white flex flex-col h-full">
      <Link to={`/community/${l.id}`} className="aspect-[16/10] border-b-2 border-black overflow-hidden bg-[#F4F4F4] block relative">
        {l.image_url ? (
          <img src={l.image_url} alt={l.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-black text-5xl text-black/20">{l.name[0]}</div>
        )}
        {l.is_featured && (
          <span data-testid={`listing-featured-${l.slug}`} className="absolute top-2 left-2 bg-[#FFD100] brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase inline-flex items-center gap-1"><Star size={10} strokeWidth={3} />Featured</span>
        )}
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <span className={`self-start brutal-border px-2 py-0.5 font-display font-black text-[10px] uppercase ${CATEGORY_COLORS[l.category] || "bg-white"}`}>{l.category}</span>
        <Link to={`/community/${l.id}`}><h3 className="font-display font-black text-xl mt-2 leading-tight">{l.name}</h3></Link>
        {l.instagram && <p className="text-xs font-bold text-black/60 mt-1">@{l.instagram}</p>}
        <p className="mt-2 text-sm text-black/75 line-clamp-3 flex-1">{l.short_description}</p>
        {l.neighbourhood && (
          <p className="mt-3 text-xs font-bold inline-flex items-center gap-1 text-black/70"><MapPin size={12} strokeWidth={3} />{l.neighbourhood}</p>
        )}
        <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between gap-2 flex-wrap">
          <Link to={`/community/${l.id}`} data-testid={`listing-details-${l.slug}`} className="font-display font-bold uppercase text-sm hover:bg-[#FFD100] px-2 py-1">Details →</Link>
          <div className="flex items-center gap-2">
            {l.website && (
              <a href={l.website} target="_blank" rel="noreferrer" data-testid={`listing-website-${l.slug}`} title="Website" className="bg-white brutal-border brutal-press p-1.5"><Globe size={14} strokeWidth={3} /></a>
            )}
            <InstagramLink listing={l} testId={`listing-instagram-${l.slug}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

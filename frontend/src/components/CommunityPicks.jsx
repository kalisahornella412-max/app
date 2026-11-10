import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowRight, Instagram, Star } from "lucide-react";
import { CATEGORY_COLORS } from "./ListingCard";

export default function CommunityPicks() {
  const [picks, setPicks] = useState([]);
  useEffect(() => { api.get("/listings?featured=true").then((r) => setPicks(r.data.slice(0, 5))).catch(() => {}); }, []);
  if (picks.length === 0) return null;
  return (
    <section data-testid="community-picks" className="border-b-2 border-black bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
          <div>
            <span className="label-overline text-[#FF3B30] inline-flex items-center gap-1"><Star size={12} strokeWidth={3} />Community picks</span>
            <h2 className="font-display font-black tracking-tighter text-3xl sm:text-4xl mt-1">Local businesses & communities.</h2>
          </div>
          <Link to="/community" data-testid="community-picks-all" className="font-display font-bold uppercase text-sm inline-flex items-center gap-1 brutal-border brutal-shadow-sm brutal-press bg-[#FFD100] px-3 py-2">Browse the directory <ArrowRight size={14} strokeWidth={3} /></Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {picks.map((l) => (
            <Link key={l.id} to={`/community/${l.id}`} data-testid={`community-pick-${l.slug}`} className="shrink-0 w-56 lg:w-auto lg:flex-1 brutal-border brutal-shadow bg-white brutal-press flex flex-col">
              <div className="aspect-[4/3] border-b-2 border-black overflow-hidden bg-[#F4F4F4]">
                {l.image_url && <img src={l.image_url} alt={l.name} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="p-3">
                <span className={`inline-block brutal-border px-1.5 py-0.5 font-display font-black text-[9px] uppercase ${CATEGORY_COLORS[l.category] || "bg-white"}`}>{l.category.split(" &")[0]}</span>
                <p className="font-display font-bold leading-tight mt-1.5 line-clamp-2">{l.name}</p>
                {l.instagram && <p className="text-[11px] font-bold text-black/60 mt-0.5 inline-flex items-center gap-1"><Instagram size={10} strokeWidth={3} />@{l.instagram}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

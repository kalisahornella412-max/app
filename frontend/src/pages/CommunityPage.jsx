import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Search, Send } from "lucide-react";
import ListingCard, { CATEGORY_COLORS } from "../components/ListingCard";
import BackButton from "../components/BackButton";

export const SUBMIT_FORM_URL = "https://forms.gle/ENhjYeLfwYp9BACA6";

export default function CommunityPage() {
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const setCategory = (c) => setParams(c === "all" ? {} : { category: c }, { replace: true });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/listings/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    const t = setTimeout(() => {
      api.get(`/listings?${params}`).then((r) => setListings(r.data)).catch(() => setListings([])).finally(() => setLoading(false));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [category, q]);

  return (
    <div data-testid="community-page" className="bg-white">
      <section className="border-b-2 border-black bg-[#F4F4F4]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackButton />
          <span className="label-overline">/ Community Directory</span>
          <h1 className="font-display font-black tracking-tighter text-5xl sm:text-6xl mt-2">Halifax, by Halifax.</h1>
          <p className="mt-3 max-w-2xl text-black/75">Local barbers, photographers, bakers, dance crews and faith communities — many run straight from Instagram. Browse, tap "View Instagram", and support people from here.</p>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none]" data-testid="community-category-filters">
            <button onClick={() => setCategory("all")} data-testid="community-cat-all"
              className={`shrink-0 brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-xs uppercase ${category === "all" ? "bg-[#FFD100]" : "bg-white"}`}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} data-testid={`community-cat-${c.split(" ")[0].toLowerCase()}`}
                className={`shrink-0 whitespace-nowrap brutal-border brutal-shadow-sm brutal-press px-3 py-2 font-display font-bold text-xs uppercase ${category === c ? CATEGORY_COLORS[c] : "bg-white"}`}>{c}</button>
            ))}
          </div>

          <div className="mt-4 grid md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search size={18} strokeWidth={3} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names, neighbourhoods, @handles…" data-testid="community-search"
                className="w-full bg-white brutal-border brutal-shadow-sm pl-10 pr-3 py-3 font-medium focus:outline-none focus:bg-[#FFFCEA]" />
            </div>
            <a href={SUBMIT_FORM_URL} target="_blank" rel="noreferrer" data-testid="community-submit-link"
              className="md:col-span-4 bg-black text-white brutal-border brutal-shadow-sm brutal-press px-4 py-3 font-display font-bold text-sm uppercase inline-flex items-center justify-center gap-2">
              <Send size={14} strokeWidth={3} />Submit your business
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="font-mono-d text-sm mb-6" data-testid="community-count">{loading ? "Loading…" : `${listings.length} listing${listings.length !== 1 ? "s" : ""}${category !== "all" ? ` · ${category}` : ""}`}</p>
        {!loading && listings.length === 0 ? (
          <div className="brutal-border bg-[#F4F4F4] p-8 text-center">
            <p className="font-display font-black text-xl">Nothing here yet.</p>
            <p className="text-sm text-black/70 mt-1">Know a business or group that belongs here? <a href={SUBMIT_FORM_URL} target="_blank" rel="noreferrer" className="underline font-bold">Submit it</a> and we'll review it.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
        <p className="mt-10 text-xs text-black/60 max-w-2xl">Listings are submitted by the community and reviewed before publishing. Halifax Youth Hub doesn't endorse or verify individual businesses — check reviews and confirm details with the provider.</p>
      </section>
    </div>
  );
}

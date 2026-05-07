import { useAudience } from "../lib/audience";
import { Globe, GraduationCap } from "lucide-react";

export default function AudienceToggle({ compact = false }) {
  const { audience, setAudience } = useAudience();
  const opts = [
    { id: "youth", label: "Youth", Icon: GraduationCap },
    { id: "immigrant", label: "Newcomers", Icon: Globe },
  ];
  return (
    <div
      data-testid="audience-toggle"
      className={`inline-flex brutal-border ${compact ? "" : "brutal-shadow-sm"} bg-white p-0.5 gap-0.5`}
    >
      {opts.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setAudience(id)}
          data-testid={`audience-${id}`}
          aria-pressed={audience === id}
          className={`px-2.5 py-1 font-display font-bold uppercase text-xs tracking-wide inline-flex items-center gap-1 transition-colors ${
            audience === id ? "bg-[#FFD100] text-black" : "bg-white text-black hover:bg-[#F4F4F4]"
          }`}
        >
          <Icon size={12} strokeWidth={3} />
          {label}
        </button>
      ))}
    </div>
  );
}

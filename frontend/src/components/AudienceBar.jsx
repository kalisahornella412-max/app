import { useAudience } from "../lib/audience";
import { Sparkles } from "lucide-react";
import AudienceToggle from "./AudienceToggle";

export default function AudienceBar() {
  const { audience } = useAudience();
  const isNewcomer = audience === "immigrant";
  return (
    <div
      data-testid="audience-bar"
      className={`border-b-2 border-black ${isNewcomer ? "bg-[#0055A4] text-white" : "bg-[#FFD100] text-black"}`}
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} strokeWidth={3} className="shrink-0" />
          <span className="label-overline text-xs">
            Now viewing:{" "}
            <span className="font-display font-black">
              {isNewcomer ? "Newcomer / Immigrant resources" : "Halifax youth resources (15–30)"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase hidden sm:inline-block opacity-80">Switch:</span>
          <AudienceToggle compact />
        </div>
      </div>
    </div>
  );
}

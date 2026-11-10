import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ fallback = "/", className = "" }) {
  const navigate = useNavigate();
  function go() {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback);
  }
  return (
    <div className={`mb-4 ${className}`}>
      <button type="button" onClick={go} data-testid="back-button"
        className="inline-flex items-center gap-1.5 bg-white text-black brutal-border brutal-shadow-sm brutal-press px-3 py-1.5 font-display font-bold text-xs uppercase hover:bg-[#FFD100]">
        <ArrowLeft size={14} strokeWidth={3} />Back
      </button>
    </div>
  );
}

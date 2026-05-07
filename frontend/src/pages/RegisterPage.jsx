import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const { user, register, formatApiErrorDetail } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Account created. Let's go!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  }

  return (
    <div data-testid="register-page" className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#F4F4F4] p-4">
      <div className="w-full max-w-md brutal-border brutal-shadow-lg bg-white p-8">
        <span className="label-overline text-[#0055A4]">/ Sign up</span>
        <h1 className="font-display font-black tracking-tighter text-4xl mt-1">Create your hub.</h1>
        <p className="mt-2 text-sm text-black/70">Free forever. Save programs, RSVP to events, and unlock the AI resume builder.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label-overline">Name</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              data-testid="register-name"
              className="mt-1 w-full bg-white brutal-border px-3 py-3 focus:outline-none focus:bg-[#FFFCEA]"
            />
          </div>
          <div>
            <label className="label-overline">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
              className="mt-1 w-full bg-white brutal-border px-3 py-3 focus:outline-none focus:bg-[#FFFCEA]"
            />
          </div>
          <div>
            <label className="label-overline">Password (min 6)</label>
            <input
              type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
              className="mt-1 w-full bg-white brutal-border px-3 py-3 focus:outline-none focus:bg-[#FFFCEA]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            data-testid="register-submit"
            className="w-full bg-[#0055A4] text-white brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase tracking-wide disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="font-display font-bold underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

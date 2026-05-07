import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, login, formatApiErrorDetail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  }

  return (
    <div data-testid="login-page" className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#F4F4F4] p-4">
      <div className="w-full max-w-md brutal-border brutal-shadow-lg bg-white p-8">
        <span className="label-overline">/ Sign in</span>
        <h1 className="font-display font-black tracking-tighter text-4xl mt-1">Welcome back.</h1>
        <p className="mt-2 text-sm text-black/70">Pick up where you left off — saved programs, your resume, and RSVPs.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label-overline">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
              className="mt-1 w-full bg-white brutal-border px-3 py-3 focus:outline-none focus:bg-[#FFFCEA]"
            />
          </div>
          <div>
            <label className="label-overline">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              className="mt-1 w-full bg-white brutal-border px-3 py-3 focus:outline-none focus:bg-[#FFFCEA]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[#FFD100] brutal-border brutal-shadow brutal-press py-3 font-display font-bold uppercase tracking-wide disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center">
          New here?{" "}
          <Link to="/register" className="font-display font-bold underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

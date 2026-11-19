"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  LogIn,
  Check,
} from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid username or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to authentication server.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative bg-[#f8fafc]"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(226, 232, 240, 0.55) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(226, 232, 240, 0.55) 1px, transparent 1px)
        `,
        backgroundSize: "34px 34px",
      }}
    >
      {/* Login Card */}
      <div className="w-full max-w-[430px] bg-white rounded-2xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] border border-slate-100 overflow-hidden">
        {/* Top Red-to-Navy Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#ff2d32] via-[#a33857] to-[#2c4c80]" />

        <div className="px-9 pt-8 pb-9">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img
              src="/nikkou-logo.png"
              alt="Nikkou Centre"
              className="h-20 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://i.postimg.cc/7Pdx3FCD/nikkou-logo.png";
              }}
            />
          </div>

          {/* Institutional Portal Pill */}
          <div className="flex justify-center mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#fdf2f2] border border-[#f9d5d5] text-[#c53030] text-[10.5px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#e02424]" />
              <span>INSTITUTIONAL PORTAL</span>
            </div>
          </div>

          {/* Heading & Subheading */}
          <div className="text-center mb-7">
            <h1 className="text-[24px] font-extrabold text-[#1e355b] tracking-tight">
              Admin Portal
            </h1>
            <p className="text-[13px] text-slate-500 font-medium mt-0.5">
              Japanese Language School &amp; Consultancy
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Username */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin-nikkou"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#eef3fb] border border-[#dfe7f4] text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2c4c80]/20 focus:border-[#2c4c80] transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#eef3fb] border border-[#dfe7f4] text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2c4c80]/20 focus:border-[#2c4c80] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-700 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="pt-0.5 pb-1">
              <label
                onClick={() => setRememberMe((prev) => !prev)}
                className="inline-flex items-center gap-2.5 cursor-pointer select-none"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    rememberMe
                      ? "bg-[#e02424] border-[#e02424] text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="text-[12.5px] font-medium text-slate-600">
                  Remember me
                </span>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#e02424] hover:bg-[#c81e1e] text-white font-bold text-[14px] shadow-[0_6px_18px_-3px_rgba(224,36,36,0.45)] transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Copyright Footer */}
          <p className="text-[11.5px] text-slate-400 font-medium text-center mt-7">
            © 2026 Nikkou Centre International. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

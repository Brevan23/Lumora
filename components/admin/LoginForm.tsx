"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { LockIcon, SpinnerIcon } from "@/components/site/icons";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-card"
      >
        <div className="flex items-center gap-2 text-amber-deep">
          <LockIcon />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            {BRAND} admin
          </span>
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Enter the admin password to view orders.
        </p>

        <label htmlFor="password" className="mt-6 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-ivory px-4 py-3 outline-none focus:border-amber focus:ring-2 focus:ring-amber/30"
        />

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-primary mt-6 w-full"
        >
          {loading ? (
            <>
              <SpinnerIcon width={18} height={18} /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm({
  usernameRequired,
  isPreview,
}: {
  usernameRequired: boolean;
  isPreview: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(
        body.error === "Invalid credentials" && usernameRequired && !username
          ? "Username and password are required"
          : (body.error ?? "Invalid credentials")
      );
      return;
    }

    const from = searchParams.get("from") || "/";
    router.push(from);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form onSubmit={handleSubmit} className="card w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Daily Trader
            {isPreview ? (
              <span className="font-normal text-slate-400"> (Preview)</span>
            ) : null}
          </h1>
          <p className="text-sm text-slate-400">Sign in to manage your overnight bot.</p>
        </div>
        <div>
          <label className="label" htmlFor="username">
            {usernameRequired ? "Username" : "Username (optional)"}
          </label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required={usernameRequired}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

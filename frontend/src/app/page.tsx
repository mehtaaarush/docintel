"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(`API: ${data.status} (env: ${data.env})`))
      .catch((err) => setStatus(`API unreachable ? ${err.message}`));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">DocIntel</h1>
        <p className="mt-3 text-sm opacity-70">{status}</p>
      </div>
    </main>
  );
}

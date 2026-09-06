"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-[55vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md py-16">
        <div className="text-3xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          This page hit an unexpected error. Other pages are unaffected — try
          again below.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

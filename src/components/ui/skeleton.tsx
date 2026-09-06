"use client";

import { cn } from "@/lib/utils";

/**
 * Shared building blocks for admin loading states.
 * Instead of a bare spinner, pages show pulsing placeholders that mimic the
 * real layout (same pattern as the public Squad page).
 */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Full content skeleton used while a whole page is fetching. */
export function PageSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)} aria-busy>
      {/* Header + action button */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {/* Card with table-like rows */}
      <div className="rounded-xl border bg-card">
        <div className="space-y-0 p-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-4 border-b py-3.5 last:border-0",
                i === rows - 1 && "pb-1"
              )}
            >
              <Skeleton className={cn("h-9 w-9 rounded-full", i % 2 === 1 && "hidden sm:block")} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">Loading…</p>
    </div>
  );
}

/** Stacked skeleton rows for mobile lists (avatar + two lines each). */
export function MobileListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3" aria-busy>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton rows to render inside a <TableBody> while data loads.
 * Columns mirror the real table width with alternating line lengths.
 */
export function TableRowsSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton
                className={cn(
                  "h-4",
                  c === 0 ? "w-3/4" : c === cols - 1 ? "w-2/3" : "w-1/2",
                  (r + c) % 3 === 0 && "w-2/3"
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

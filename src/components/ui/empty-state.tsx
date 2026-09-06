"use client";

import type { ComponentType } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Icon shown in the circular badge (defaults to an inbox). */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  /** Optional action (e.g. a "Create first…" button or a helpful link). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Honest empty state — used whenever a page has no records to show.
 * Mirrors the pattern on the public Squad page (icon + title + hint),
 * instead of a bare line of grey text.
 */
export function EmptyState({ icon: Icon = Inbox, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {message && (
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

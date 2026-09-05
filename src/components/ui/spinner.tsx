"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex-1 flex items-center justify-center py-20", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

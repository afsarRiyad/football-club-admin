"use client";

import React from "react";
import Link from "next/link";
import { useClub } from "@/lib/use-club";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Plus, Loader2 } from "lucide-react";

/**
 * Wraps admin page content and shows a warning if no club exists.
 * Shows loading state while fetching, error state on failure,
 * or a "Create your first club" prompt when the club list is empty.
 * When a club exists, renders children normally.
 */
export function ClubGuard({ children }: { children: React.ReactNode }) {
  const { clubId, loading, error } = useClub();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !clubId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center text-center py-10 space-y-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="h-7 w-7 text-amber-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold">No Club Found</h2>
              <p className="text-sm text-muted-foreground">
                {error || "You need to create a club before managing players, teams, matches, and more."}
              </p>
            </div>
            <Link href="/clubs">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Club
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export default ClubGuard;

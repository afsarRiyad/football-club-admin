"use client";

import React from "react";
import Link from "next/link";
import { useClub } from "@/lib/use-club";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Plus } from "lucide-react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Wraps admin page content and shows a warning if no club exists.
 * Shows loading state while fetching, error state on failure,
 * or a "Create your first club" prompt when the club list is empty.
 * When a club exists, renders children normally.
 */
export function ClubGuard({ children }: { children: React.ReactNode }) {
  const { clubId, loading, error } = useClub();

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !clubId) {
    return (
      <div className="py-8">
        <Card className="max-w-md w-full mx-auto">
          <CardContent className="p-0">
            <EmptyState
              icon={Shield}
              title="No Club Found"
              message={error || "You need to create a club before managing players, teams, matches, and more."}
              action={
                <Link href="/clubs">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Club
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export default ClubGuard;

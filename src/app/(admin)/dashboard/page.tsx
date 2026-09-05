"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Calendar, Newspaper, Trophy, Shield } from "lucide-react";

interface StatCard {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clubs, players, teams, matches, news, competitions] = await Promise.allSettled([
        api.get("/clubs", { params: { limit: 1 } }),
        api.get("/players", { params: { limit: 1 } }),
        api.get("/teams", { params: { limit: 1 } }),
        api.get("/matches", { params: { limit: 1 } }),
        api.get("/news", { params: { limit: 1 } }),
        api.get("/competitions", { params: { limit: 1 } }),
      ]);

      setStats([
        { title: "Clubs", value: clubs.status === "fulfilled" ? clubs.value.data.total || 0 : 0, icon: Shield, color: "text-blue-600 bg-blue-100" },
        { title: "Players", value: players.status === "fulfilled" ? players.value.data.total || 0 : 0, icon: UserCheck, color: "text-green-600 bg-green-100" },
        { title: "Teams", value: teams.status === "fulfilled" ? teams.value.data.total || 0 : 0, icon: Users, color: "text-purple-600 bg-purple-100" },
        { title: "Matches", value: matches.status === "fulfilled" ? matches.value.data.total || 0 : 0, icon: Calendar, color: "text-orange-600 bg-orange-100" },
        { title: "News Articles", value: news.status === "fulfilled" ? news.value.data.total || 0 : 0, icon: Newspaper, color: "text-cyan-600 bg-cyan-100" },
        { title: "Competitions", value: competitions.status === "fulfilled" ? competitions.value.data.total || 0 : 0, icon: Trophy, color: "text-amber-600 bg-amber-100" },
      ]);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your club management platform.</p>
      </div>

      {/* Stats Grid - mobile: 1 col, tablet: 2 cols, desktop: 3 cols */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">
                {loading ? "—" : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Add Player", href: "/players" },
              { label: "Schedule Match", href: "/matches" },
              { label: "Post News", href: "/news" },
              { label: "Manage Teams", href: "/teams" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center justify-center h-10 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 text-sm font-medium transition-colors"
              >
                {action.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

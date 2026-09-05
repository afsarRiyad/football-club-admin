"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import Sidebar from "@/components/layout/sidebar";
import { PageSpinner } from "@/components/ui/spinner";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Shield, Trophy, Calendar,
  Newspaper, Image, GraduationCap, Dumbbell, Target, BarChart3,
  Crown, Settings, LogOut, Swords, Mail, Workflow,
} from "lucide-react";

// Mobile nav links (duplicated for sheet)
const mobileTopLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clubs", label: "Clubs", icon: Shield },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/players", label: "Players", icon: UserCheck },
  { href: "/formation", label: "Formation", icon: Workflow },
  { href: "/captains", label: "Captains", icon: Crown },
  { href: "/matches", label: "Matches", icon: Calendar },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/tournaments", label: "Tournaments", icon: Swords },
  { href: "/seasons", label: "Seasons", icon: Target },
];

const mobileContentLinks = [
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/academy", label: "Academy", icon: GraduationCap },
  { href: "/training", label: "Training", icon: Dumbbell },
];

const mobileBottomLinks = [
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/members", label: "Members", icon: Crown },
  { href: "/match-requests", label: "Match Requests", icon: Mail },
  { href: "/users", label: "Users", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <PageSpinner />;
  if (!user) {
    router.push("/login");
    return <PageSpinner />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block relative">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-card border-r">
          <div className="flex items-center gap-2 px-4 h-14 border-b shrink-0">
            <img
              src="http://localhost:3000/logo.png"
              alt="N.S Club Logo"
              className="h-7 w-auto object-contain"
            />
            <span className="font-bold text-sm">N.S Club Admin</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1" onClick={() => setMobileMenuOpen(false)}>
            <div className="space-y-0.5">
              {mobileTopLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t my-3" />
            <div className="space-y-0.5">
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Content
              </p>
              {mobileContentLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t my-3" />
            <div className="space-y-0.5">
              {mobileBottomLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="border-t px-4 py-3 space-y-2 shrink-0">
            <div className="px-3 py-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { logout(); setMobileMenuOpen(false); }}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-medium truncate">{pathname.split("/").pop()?.replace(/[-_]/g, " ") || "Dashboard"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-muted-foreground hover:text-foreground md:hidden">
              <Bell className="h-4 w-4" />
            </button>
            <div className="text-sm hidden sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role.replace(/_/g, " ")}</p>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

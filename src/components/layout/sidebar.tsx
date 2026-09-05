"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Shield, Trophy, Calendar,
  Newspaper, Image, GraduationCap, Dumbbell, Target, BarChart3,
  Crown, Settings, ChevronLeft, ChevronRight, LogOut, Swords, Workflow, Mail,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const topLinks = [
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

const contentLinks = [
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/academy", label: "Academy", icon: GraduationCap },
  { href: "/training", label: "Training", icon: Dumbbell },
];

const bottomLinks = [
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/members", label: "Members", icon: Crown },
  { href: "/match-requests", label: "Match Requests", icon: Mail },
  { href: "/users", label: "Users", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  // Hide sidebar completely on mobile - use sheet instead
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-14 border-b shrink-0">
        <img
          src="/logo.png"
          alt="N.S Club Logo"
          className="h-7 w-auto object-contain"
        />
        {!collapsed && <span className="font-bold text-sm">N.S Club Admin</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <div className="space-y-0.5">
          {topLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        <Separator className="my-3" />

        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Content
            </p>
          )}
          {contentLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        <Separator className="my-3" />

        <div className="space-y-0.5">
          {bottomLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t px-2 py-3 space-y-2 shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
          </div>
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-1 justify-start gap-2", collapsed && "justify-center px-0")}
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute top-16 -right-3 h-6 w-6 bg-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground z-10"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}

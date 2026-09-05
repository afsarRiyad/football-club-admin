"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PlayerCardStats {
  pac?: number;
  sho?: number;
  pas?: number;
  dri?: number;
  def?: number;
  phy?: number;
}

/** Calculate overall rating from the 6 stats */
export function calcOVR(stats: PlayerCardStats): number {
  const { pac = 50, sho = 50, pas = 50, dri = 50, def = 50, phy = 50 } = stats;
  return Math.round((pac + sho + pas + dri + def + phy) / 6);
}

function getOVRColor(ovr: number) {
  if (ovr >= 85) return "text-yellow-400";
  if (ovr >= 75) return "text-green-500";
  if (ovr >= 60) return "text-emerald-400";
  if (ovr >= 45) return "text-orange-400";
  return "text-red-400";
}

function getStatColor(val: number) {
  if (val >= 80) return "bg-green-500";
  if (val >= 65) return "bg-emerald-400";
  if (val >= 50) return "bg-yellow-400";
  if (val >= 35) return "bg-orange-400";
  return "bg-red-400";
}

function StatRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${getStatColor(value)} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold w-6 text-right">{value}</span>
    </div>
  );
}

interface PlayerCardProps {
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  photo?: string;
  stats: PlayerCardStats;
  className?: string;
  compact?: boolean;
}

/**
 * FIFA-style player card component.
 * Use `compact` for inline/table display, default for standalone cards.
 */
export function PlayerCard({
  firstName,
  lastName,
  number,
  position,
  photo,
  stats,
  className,
  compact = false,
}: PlayerCardProps) {
  const ovr = calcOVR(stats);
  const posLabel = position
    ? position === "GOALKEEPER" ? "GK"
    : position === "DEFENDER" ? "DEF"
    : position === "MIDFIELDER" ? "MID"
    : position === "FORWARD" ? "FWD"
    : position
    : "—";

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-2 border rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white px-3 py-2", className)}>
        {/* OVR badge */}
        <div className="flex flex-col items-center">
          <span className={cn("text-lg font-black leading-none", getOVRColor(ovr))}>{ovr}</span>
          <span className="text-[9px] font-bold text-white/60 uppercase">OVR</span>
        </div>
        {/* Name + pos */}
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">{firstName} {lastName}</p>
          <div className="flex items-center gap-1.5">
            {number && <span className="text-[10px] text-white/50">#{number}</span>}
            <span className="text-[10px] text-white/50">{posLabel}</span>
          </div>
        </div>
        {/* Mini stats */}
        <div className="flex flex-col gap-0.5 ml-1">
          {[
            ["PAC", stats.pac ?? 50],
            ["SHO", stats.sho ?? 50],
            ["PAS", stats.pas ?? 50],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center gap-1">
              <span className="text-[9px] text-white/50 w-6">{l}</span>
              <span className="text-[10px] font-mono font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-56 rounded-2xl overflow-hidden shadow-xl border border-white/10",
      "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white",
      className,
    )}>
      {/* Header: OVR + Position */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex flex-col items-center">
          <span className={cn("text-4xl font-black leading-none", getOVRColor(ovr))}>{ovr}</span>
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">OVR</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-black text-white/80">{posLabel}</span>
          {number && <span className="text-xs text-white/40">#{number}</span>}
        </div>
      </div>

      {/* Photo */}
      <div className="flex justify-center my-3">
        {photo ? (
          <img
            src={photo}
            alt={`${firstName} ${lastName}`}
            className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-white/30">
              {firstName[0]}{lastName[0]}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center px-4 pb-3">
        <p className="text-sm font-bold tracking-wide uppercase">
          {firstName} <span className="text-white/60">{lastName}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="bg-black/30 px-4 py-3 space-y-1.5">
        <StatRow label="PAC" value={stats.pac ?? 50} />
        <StatRow label="SHO" value={stats.sho ?? 50} />
        <StatRow label="PAS" value={stats.pas ?? 50} />
        <StatRow label="DRI" value={stats.dri ?? 50} />
        <StatRow label="DEF" value={stats.def ?? 50} />
        <StatRow label="PHY" value={stats.phy ?? 50} />
      </div>
    </div>
  );
}

export default PlayerCard;

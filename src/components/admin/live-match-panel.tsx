"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Plus, Trash2,
  AlertTriangle, ArrowRightLeft, XCircle, Target, Clock, ChevronDown, ChevronUp, Minus, BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

type EventType = "GOAL" | "OWN_GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "PENALTY_MISSED" | "INJURY";

interface MatchEvent {
  type: EventType;
  minute?: number;
  player?: string;
  assist?: string;
  description?: string;
  _id?: string;
}

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  number?: number;
}

interface LiveMatchPanelProps {
  matchId: string;
  status: string;
  score: { home: number; away: number };
  homeTeamId?: string;
  awayTeamId?: string;
  onUpdate?: () => void;
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ReactNode; color: string; bg: string; borderColor: string }> = {
  GOAL: { label: "Goal", icon: <Target className="h-4 w-4" />, color: "text-green-700", bg: "bg-green-50", borderColor: "border-green-200" },
  OWN_GOAL: { label: "Own Goal", icon: <XCircle className="h-4 w-4" />, color: "text-red-700", bg: "bg-red-50", borderColor: "border-red-200" },
  YELLOW_CARD: { label: "Yellow Card", icon: <div className="w-3 h-4 bg-yellow-400 rounded-sm" />, color: "text-yellow-700", bg: "bg-yellow-50", borderColor: "border-yellow-200" },
  RED_CARD: { label: "Red Card", icon: <div className="w-3 h-4 bg-red-600 rounded-sm" />, color: "text-red-700", bg: "bg-red-50", borderColor: "border-red-200" },
  SUBSTITUTION: { label: "Substitution", icon: <ArrowRightLeft className="h-4 w-4" />, color: "text-blue-700", bg: "bg-blue-50", borderColor: "border-blue-200" },
  PENALTY_MISSED: { label: "Pen. Missed", icon: <div className="w-3 h-3 rounded-full border-2 border-orange-400" />, color: "text-orange-700", bg: "bg-orange-50", borderColor: "border-orange-200" },
  INJURY: { label: "Injury", icon: <AlertTriangle className="h-4 w-4" />, color: "text-rose-700", bg: "bg-rose-50", borderColor: "border-rose-200" },
};

export function LiveMatchPanel({ matchId, status, score, homeTeamId, awayTeamId, onUpdate }: LiveMatchPanelProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Players
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<EventType>("GOAL");
  const [formMinute, setFormMinute] = useState("");
  const [formPlayer, setFormPlayer] = useState("");
  const [formAssist, setFormAssist] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSide, setFormSide] = useState<"home" | "away">("home");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(true);
  const [localScore, setLocalScore] = useState(score);

  // Sync local score when prop changes
  useEffect(() => { setLocalScore(score); }, [score]);

  const fetchMatch = useCallback(async () => {
    try {
      const { data } = await api.get(`/matches/${matchId}`);
      const matchData = data.data.match;
      setEvents(matchData?.events || []);

      // Fetch home team players
      const homeId = typeof matchData.homeTeam === "object" ? matchData.homeTeam?._id : homeTeamId;
      if (homeId) {
        try {
          const { data: hRes } = await api.get(`/teams/${homeId}`);
          const players = hRes.data.team?.players || [];
          setHomePlayers(players.map((p: any) => typeof p === "object" ? p : { _id: p }));
        } catch { setHomePlayers([]); }
      }

      // Fetch away team players
      const awayId = typeof matchData.awayTeam === "object" ? matchData.awayTeam?._id : awayTeamId;
      if (awayId) {
        try {
          const { data: aRes } = await api.get(`/teams/${awayId}`);
          const players = aRes.data.team?.players || [];
          setAwayPlayers(players.map((p: any) => typeof p === "object" ? p : { _id: p }));
        } catch { setAwayPlayers([]); }
      }
    } catch (e) {
      console.error("Failed to fetch match:", e);
    } finally {
      setLoading(false);
    }
  }, [matchId, homeTeamId, awayTeamId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const getPlayerName = (id: string, side: "home" | "away"): string => {
    const list = side === "home" ? homePlayers : awayPlayers;
    const p = list.find((pl) => pl._id === id);
    if (!p) return id;
    return `${p.firstName} ${p.lastName}`;
  };

  const getPlayerText = (player: any, side?: "home" | "away"): string => {
    if (!player) return "";
    if (typeof player === "object") return `${player.firstName || ""} ${player.lastName || ""}`.trim();
    if (typeof player === "string") {
      if (side) return getPlayerName(player, side);
      const found = homePlayers.find((p) => p._id === player);
      if (found) return `${found.firstName} ${found.lastName}`;
      const foundAway = awayPlayers.find((p) => p._id === player);
      if (foundAway) return `${foundAway.firstName} ${foundAway.lastName}`;
      return player;
    }
    return String(player);
  };

  // ── Score helpers ──
  const updateScoreImmediate = async (home: number, away: number) => {
    setLocalScore({ home, away }); // optimistic update
    try {
      await api.patch(`/matches/${matchId}`, { score: { home, away } });
      onUpdate?.();
    } catch (e: any) {
      toast.error("Failed to update score");
      setLocalScore(score); // revert
    }
  };

  const incrementScore = (side: "home" | "away") => {
    const newHome = side === "home" ? localScore.home + 1 : localScore.home;
    const newAway = side === "away" ? localScore.away + 1 : localScore.away;
    updateScoreImmediate(newHome, newAway);
  };

  const decrementScore = (side: "home" | "away") => {
    const newHome = side === "home" ? Math.max(0, localScore.home - 1) : localScore.home;
    const newAway = side === "away" ? Math.max(0, localScore.away - 1) : localScore.away;
    updateScoreImmediate(newHome, newAway);
  };

  // ── Events ──
  const addEvent = async (type: EventType) => {
    setSubmitting(true);
    try {
      const payload: any = { type };
      if (formMinute) payload.minute = parseInt(formMinute);

      if (formSide === "home") {
        if (formPlayer) payload.player = formPlayer;
        if (formAssist) payload.assist = formAssist;
      } else {
        const parts = [];
        if (formPlayer) parts.push(formPlayer);
        if (formAssist) parts.push(`assist: ${formAssist}`);
        if (parts.length > 0) payload.description = parts.join(" | ");
      }

      if (formDescription) {
        payload.description = payload.description
          ? `${payload.description} — ${formDescription}`
          : formDescription;
      }

      await api.post(`/matches/${matchId}/events`, payload);

      // Auto-update score for goal events
      if (type === "GOAL" || type === "OWN_GOAL") {
        const newScore = {
          home: formSide === "home" ? localScore.home + 1 : localScore.home,
          away: formSide === "away" ? localScore.away + 1 : localScore.away,
        };
        // For own goals, the goal goes to the OTHER team
        if (type === "OWN_GOAL") {
          const ownScore = {
            home: formSide === "home" ? localScore.away + 1 : localScore.home,
            away: formSide === "away" ? localScore.home + 1 : localScore.away,
          };
          setLocalScore(ownScore);
          await api.patch(`/matches/${matchId}`, { score: ownScore });
        } else {
          setLocalScore(newScore);
          await api.patch(`/matches/${matchId}`, { score: newScore });
        }
      }

      setFormOpen(false);
      setFormMinute("");
      setFormPlayer("");
      setFormAssist("");
      setFormDescription("");
      toast.success(`${EVENT_CONFIG[type]?.label} added`);
      await fetchMatch();
      onUpdate?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add event");
    } finally {
      setSubmitting(false);
    }
  };

  const removeEvent = async (index: number) => {
    try {
      await api.delete(`/matches/${matchId}/events/${index}`);
      toast.success("Event removed");
      await fetchMatch();
      onUpdate?.();
    } catch (e: any) {
      toast.error("Failed to remove event");
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/matches/${matchId}`, { status: newStatus });
      toast.success(`Status: ${newStatus}`);
      onUpdate?.();
    } catch (e: any) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isLive = status === "LIVE" || status === "HT";

  // ── Determine which side an event belongs to ──
  const getEventSide = (event: MatchEvent): "home" | "away" => {
    // If event has a player ID that's in home team → home
    if (event.player && typeof event.player === "string" && homePlayers.some((p) => p._id === event.player)) return "home";
    if (event.player && typeof event.player === "object" && homePlayers.some((p) => p._id === (event.player as any)._id)) return "home";
    // If event has a player ID that's in away team → away
    if (event.player && typeof event.player === "string" && awayPlayers.some((p) => p._id === event.player)) return "away";
    // If description contains "assist:" pattern → likely away (typed name)
    if (event.description?.includes("assist:")) return "away";
    return "home";
  };

  const getEventDisplay = (event: MatchEvent) => {
    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.GOAL;
    const side = getEventSide(event);
    const playerText = getPlayerText(event.player, side);
    const assistText = getPlayerText(event.assist, side);
    const extraText = assistText
      ? event.type === "GOAL" ? `(assist: ${assistText})` : `→ ${assistText}`
      : "";

    return { cfg, playerText, extraText, side };
  };

  // Count events by type
  const eventCounts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      {/* ── Score Display ── */}
      <div className="bg-gradient-to-br from-muted/40 via-muted/60 to-muted/40 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Home Score */}
          <div className="flex-1 text-center">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Home</p>
            <div className="flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                onClick={() => decrementScore("home")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-4xl sm:text-5xl font-black tabular-nums min-w-[60px] text-center">
                {localScore.home}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                onClick={() => incrementScore("home")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl sm:text-3xl font-black text-muted-foreground">:</span>
          </div>

          {/* Away Score */}
          <div className="flex-1 text-center">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Away</p>
            <div className="flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                onClick={() => decrementScore("away")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-4xl sm:text-5xl font-black tabular-nums min-w-[60px] text-center">
                {localScore.away}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                onClick={() => incrementScore("away")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Manual score input (hidden on small, visible on sm+) */}
        <div className="hidden sm:flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Manual:</span>
          <Input
            type="number" min={0} max={99}
            value={localScore.home}
            onChange={(e) => updateScoreImmediate(parseInt(e.target.value) || 0, localScore.away)}
            className="w-14 h-7 text-center text-sm font-bold"
          />
          <span className="text-sm text-muted-foreground">-</span>
          <Input
            type="number" min={0} max={99}
            value={localScore.away}
            onChange={(e) => updateScoreImmediate(localScore.home, parseInt(e.target.value) || 0)}
            className="w-14 h-7 text-center text-sm font-bold"
          />
        </div>
      </div>

      {/* ── Status Controls ── */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Match Status</Label>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: "SCHEDULED", label: "Scheduled", icon: "📅" },
            { value: "LIVE", label: "Live", icon: "🔴" },
            { value: "HT", label: "Half Time", icon: "⏸️" },
            { value: "FT", label: "Full Time", icon: "🏁" },
            { value: "POSTPONED", label: "Postponed", icon: "⏳" },
            { value: "CANCELLED", label: "Cancelled", icon: "❌" },
          ].map((s) => {
            const isActive = status === s.value;
            const isLiveBtn = s.value === "LIVE";
            return (
              <Button
                key={s.value}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`h-8 text-xs font-medium px-2.5 gap-1 ${
                  isActive && isLiveBtn ? "bg-red-500 hover:bg-red-600 text-white" :
                  isActive ? "" : ""
                }`}
                onClick={() => updateStatus(s.value)}
                disabled={updatingStatus}
              >
                <span className="text-xs">{s.icon}</span>
                {s.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Quick Event Buttons ── */}
      {isLive && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Add Event</Label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"] as EventType[]).map((type) => {
              const cfg = EVENT_CONFIG[type];
              return (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  className={`h-8 text-xs gap-1.5 ${cfg.bg} ${cfg.color} border ${cfg.borderColor}`}
                  onClick={() => { setFormType(type); setFormOpen(true); }}
                  disabled={submitting}
                >
                  {cfg.icon} {cfg.label}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setFormType("GOAL"); setFormOpen(!formOpen); }}
            >
              <Plus className="h-3.5 w-3.5" /> More
            </Button>
          </div>
        </div>
      )}

      {/* ── Event Form ── */}
      {formOpen && isLive && (
        <div className="border rounded-xl p-4 space-y-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className={EVENT_CONFIG[formType]?.color}>{EVENT_CONFIG[formType]?.icon}</span>
              Add {EVENT_CONFIG[formType]?.label}
            </h4>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFormOpen(false)}>
              ✕
            </Button>
          </div>

          {/* Side selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Which team?</Label>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <Button
                size="sm"
                variant={formSide === "home" ? "default" : "ghost"}
                className="h-8 text-xs flex-1"
                onClick={() => { setFormSide("home"); setFormPlayer(""); setFormAssist(""); }}
              >
                🏠 Your Club
              </Button>
              <Button
                size="sm"
                variant={formSide === "away" ? "default" : "ghost"}
                className="h-8 text-xs flex-1"
                onClick={() => { setFormSide("away"); setFormPlayer(""); setFormAssist(""); }}
              >
                ✈️ Opponent
              </Button>
            </div>
          </div>

          {/* Minute */}
          <div className="space-y-1">
            <Label className="text-xs">Minute</Label>
            <Input
              type="number" min={0} max={120}
              value={formMinute}
              onChange={(e) => setFormMinute(e.target.value)}
              placeholder="e.g. 45"
              className="h-8 text-xs"
            />
          </div>

          {formSide === "home" ? (
            /* ── Your Club: player dropdowns ── */
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Player (Your Club)</Label>
                <Select value={formPlayer} onValueChange={(v) => setFormPlayer(v ?? "")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {homePlayers.length === 0 ? (
                      <SelectItem value="none" disabled>No players in team</SelectItem>
                    ) : (
                      homePlayers.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.number ? `#${p.number} ` : ""}{p.firstName} {p.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {(formType === "GOAL" || formType === "SUBSTITUTION") && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {formType === "GOAL" ? "Assist (Your Club)" : "Player Off / On"}
                  </Label>
                  <Select value={formAssist} onValueChange={(v) => setFormAssist(v ?? "")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={formType === "GOAL" ? "Select assist" : "Select player"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {homePlayers.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.number ? `#${p.number} ` : ""}{p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            /* ── Opponent: typed name fields ── */
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Opponent Player Name</Label>
                {awayPlayers.length > 0 ? (
                  <Select value={formPlayer} onValueChange={(v) => setFormPlayer(v ?? "")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select opponent player" />
                    </SelectTrigger>
                    <SelectContent>
                      {awayPlayers.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.number ? `#${p.number} ` : ""}{p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formPlayer}
                    onChange={(e) => setFormPlayer(e.target.value)}
                    placeholder="Type opponent player name"
                    className="h-8 text-xs"
                  />
                )}
              </div>
              {(formType === "GOAL" || formType === "SUBSTITUTION") && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {formType === "GOAL" ? "Assist Player Name" : "Player Off / On"}
                  </Label>
                  {awayPlayers.length > 0 ? (
                    <Select value={formAssist} onValueChange={(v) => setFormAssist(v ?? "")}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={formType === "GOAL" ? "Select assist" : "Select player"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {awayPlayers.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.number ? `#${p.number} ` : ""}{p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formAssist}
                      onChange={(e) => setFormAssist(e.target.value)}
                      placeholder="Type name (optional)"
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Notes (Optional)</Label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Header from corner kick"
              className="h-8 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => addEvent(formType)}
              disabled={submitting || (!formPlayer && formSide === "home")}
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add {EVENT_CONFIG[formType]?.label}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Events Timeline ── */}
      <div className="space-y-2">
        <button
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
          onClick={() => setEventsExpanded(!eventsExpanded)}
        >
          <Clock className="h-3.5 w-3.5" />
          Match Events ({events.length})
          {Object.keys(eventCounts).length > 0 && (
            <div className="flex gap-1 ml-2">
              {eventCounts["GOAL"] && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">⚽ {eventCounts["GOAL"]}</Badge>}
              {eventCounts["YELLOW_CARD"] && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-yellow-50 text-yellow-700 border-yellow-200">🟨 {eventCounts["YELLOW_CARD"]}</Badge>}
              {eventCounts["RED_CARD"] && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-700 border-red-200">🟥 {eventCounts["RED_CARD"]}</Badge>}
              {eventCounts["SUBSTITUTION"] && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">🔄 {eventCounts["SUBSTITUTION"]}</Badge>}
            </div>
          )}
          <span className="ml-auto">
            {eventsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </button>

        {eventsExpanded && (
          <div className="space-y-1.5">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No events yet</p>
                <p className="text-[10px] mt-1">Use quick add buttons to record goals, cards, subs</p>
              </div>
            ) : (
              <div className="space-y-1">
                {[...events].reverse().map((event, revIdx) => {
                  const idx = events.length - 1 - revIdx;
                  const { cfg, playerText, extraText, side } = getEventDisplay(event);
                  return (
                    <div
                      key={event._id || revIdx}
                      className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.borderColor}`}
                    >
                      {/* Minute */}
                      <span className={`font-mono font-bold text-xs sm:text-sm w-8 sm:w-10 text-center ${cfg.color}`}>
                        {event.minute != null ? `${event.minute}'` : "—"}
                      </span>

                      {/* Event icon */}
                      <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${cfg.bg} border ${cfg.borderColor} shrink-0`}>
                        <span className={cfg.color}>{cfg.icon}</span>
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                          {playerText && (
                            <span className="text-xs font-medium text-foreground">
                              {playerText}
                            </span>
                          )}
                          {extraText && (
                            <span className="text-[10px] text-muted-foreground">{extraText}</span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{event.description}</p>
                        )}
                      </div>

                      {/* Side badge */}
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1 shrink-0 ${
                          side === "home"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}
                      >
                        {side === "home" ? "🏠 Club" : "✈️ Opp"}
                      </Badge>

                      {/* Delete */}
                      {isLive && (
                        <button
                          onClick={() => removeEvent(idx)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Match Statistics ── */}
      <MatchStatsEditor matchId={matchId} isLive={isLive} onUpdate={onUpdate} />
    </div>
  );
}

// ── Match Statistics Editor ──
interface StatsEditorProps {
  matchId: string;
  isLive: boolean;
  onUpdate?: () => void;
}

const STAT_ROWS = [
  { key: "possession", label: "Possession", type: "percent" as const, icon: "📊" },
  { key: "shots", label: "Total Shots", type: "number" as const, icon: "🎯" },
  { key: "shotsOnTarget", label: "Shots on Target", type: "number" as const, icon: "🏹" },
  { key: "corners", label: "Corners", type: "number" as const, icon: "🚩" },
  { key: "fouls", label: "Fouls", type: "number" as const, icon: "⚠️" },
  { key: "offsides", label: "Offsides", type: "number" as const, icon: "📏" },
  { key: "yellowCards", label: "Yellow Cards", type: "number" as const, icon: "🟨" },
  { key: "redCards", label: "Red Cards", type: "number" as const, icon: "🟥" },
  { key: "saves", label: "Saves", type: "number" as const, icon: "🧤" },
];

interface MatchStatsData {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  corners?: { home: number; away: number };
  fouls?: { home: number; away: number };
  offsides?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };
  saves?: { home: number; away: number };
}

function MatchStatsEditor({ matchId, isLive, onUpdate }: StatsEditorProps) {
  const [stats, setStats] = useState<MatchStatsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/matches/${matchId}`);
        setStats(data.data?.match?.stats || {});
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [matchId]);

  const handleChange = (key: string, side: "home" | "away", value: number) => {
    setStats((prev) => ({
      ...prev,
      [key]: { ...((prev as any)[key] || { home: 0, away: 0 }), [side]: value },
    }));
  };

  const increment = (key: string, side: "home" | "away") => {
    const current = (stats as any)?.[key]?.[side] ?? 0;
    const max = key === "possession" ? 100 : 999;
    handleChange(key, side, Math.min(current + 1, max));
  };

  const decrement = (key: string, side: "home" | "away") => {
    const current = (stats as any)?.[key]?.[side] ?? 0;
    handleChange(key, side, Math.max(current - 1, 0));
  };

  const saveStats = async () => {
    setSaving(true);
    try {
      await api.patch(`/matches/${matchId}`, { stats });
      toast.success("Statistics saved");
      onUpdate?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save stats");
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => { saveStats(); };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
        onClick={() => setExpanded(!expanded)}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Match Statistics
        <span className="ml-auto">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {expanded && (
        <div className="border rounded-xl p-3 sm:p-4 space-y-3 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Match Statistics</h4>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={saveStats} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </Button>
          </div>

          {/* Stat cards — mobile-friendly with +/- buttons */}
          <div className="space-y-2">
            {STAT_ROWS.map((row) => {
              const statData = (stats as any)[row.key] || { home: 0, away: 0 };
              const homeVal = statData.home ?? 0;
              const awayVal = statData.away ?? 0;
              return (
                <div key={row.key} className="bg-muted/40 rounded-xl p-3">
                  {/* Label center */}
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <span className="text-sm">{row.icon}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{row.label}</span>
                  </div>
                  {/* Home / Away values with +/- */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Home */}
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-lg font-bold shrink-0" onClick={() => decrement(row.key, "home")}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number" min={0} max={row.type === "percent" ? 100 : 999}
                        value={homeVal}
                        onChange={(e) => handleChange(row.key, "home", parseInt(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className="w-14 h-9 text-center text-sm font-bold font-mono"
                      />
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-lg font-bold shrink-0" onClick={() => increment(row.key, "home")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Away */}
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-lg font-bold shrink-0" onClick={() => decrement(row.key, "away")}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number" min={0} max={row.type === "percent" ? 100 : 999}
                        value={awayVal}
                        onChange={(e) => handleChange(row.key, "away", parseInt(e.target.value) || 0)}
                        onBlur={handleBlur}
                        className="w-14 h-9 text-center text-sm font-bold font-mono"
                      />
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-lg font-bold shrink-0" onClick={() => increment(row.key, "away")}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">Stats auto-save when you leave an input</p>
        </div>
      )}
    </div>
  );
}

export default LiveMatchPanel;

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Search, Plus, Minus, Trophy, Target, Shield,
  Clock, Users, Star, TrendingUp, X, Medal,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  photo?: string;
}

interface Statistic {
  _id: string;
  player: Player | string;
  type: string;
  value: number;
  season?: string;
  competition?: string;
}

const STAT_TYPES = [
  { key: "GOALS", label: "Goals", icon: <Target className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { key: "ASSISTS", label: "Assists", icon: <TrendingUp className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "APPEARANCES", label: "Appearances", icon: <Users className="h-4 w-4" />, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "MINUTES_PLAYED", label: "Minutes", icon: <Clock className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "CLEAN_SHEETS", label: "Clean Sheets", icon: <Shield className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "YELLOW_CARDS", label: "Yellow Cards", icon: <div className="w-3 h-4 bg-yellow-400 rounded-sm" />, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  { key: "RED_CARDS", label: "Red Cards", icon: <div className="w-3 h-4 bg-red-600 rounded-sm" />, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
];

const DEFAULT_SEASONS = ["2025/26", "2024/25", "2023/24", "2022/23"];

function StatisticsContent() {
  const { clubId } = useClub();

  // Players
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // All stats
  const [allStats, setAllStats] = useState<Statistic[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Seasons
  const [seasons, setSeasons] = useState<string[]>(DEFAULT_SEASONS);
  const [season, setSeason] = useState("2025/26");
  const [newSeasonInput, setNewSeasonInput] = useState("");
  const [showSeasonInput, setShowSeasonInput] = useState(false);

  // Search (for player selector)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected player
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Table sort
  const [sortBy, setSortBy] = useState("GOALS");

  // Fetch players (club + unassigned)
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        // Fetch club players + unassigned players
        const [clubRes, allRes] = await Promise.allSettled([
          api.get("/players", { params: { limit: 500, club: clubId } }),
          api.get("/players", { params: { limit: 500 } }),
        ]);
        const clubPlayers = clubRes.status === "fulfilled" ? clubRes.value.data.data || [] : [];
        const allPlayers = allRes.status === "fulfilled" ? allRes.value.data.data || [] : [];
        // Merge: club players + unassigned players (no club)
        const clubPlayerIds = new Set(clubPlayers.map((p: Player) => p._id));
        const unassigned = allPlayers.filter((p: any) => !p.club && !clubPlayerIds.has(p._id));
        setPlayers([...clubPlayers, ...unassigned]);
      } catch (e) {
        console.error("Failed to fetch players:", e);
      } finally {
        setLoadingPlayers(false);
      }
    };
    if (clubId) fetchPlayers();
  }, [clubId]);

  // Fetch seasons from API and merge with defaults
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const { data } = await api.get("/seasons", { params: { limit: 100 } });
        const apiSeasons = (data.data || []).map((s: any) => s.name);
        const unique = Array.from(new Set([...apiSeasons, ...DEFAULT_SEASONS]));
        setSeasons(unique);
      } catch (e) {
        // fallback to defaults
      }
    };
    if (clubId) fetchSeasons();
  }, [clubId]);

  // Add custom season
  const addCustomSeason = () => {
    const val = newSeasonInput.trim();
    if (!val) return;
    if (seasons.includes(val)) {
      toast.error("Season already exists");
      return;
    }
    setSeasons((prev) => [val, ...prev]);
    setSeason(val);
    setNewSeasonInput("");
    setShowSeasonInput(false);
    toast.success(`Season "${val}" added`);
  };

  // Fetch all stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get("/statistics", { params: { club: clubId, limit: 1000 } });
      setAllStats(data.data || []);
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoadingStats(false);
    }
  }, [clubId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Get stat value for player
  const getStatValue = (playerId: string, type: string): number => {
    const stat = allStats.find((s) => {
      const pid = typeof s.player === "object" ? s.player._id : s.player;
      return pid === playerId && s.type === type && s.season === season;
    });
    return stat?.value || 0;
  };

  // Get stat ID
  const getStatId = (playerId: string, type: string): string | null => {
    const stat = allStats.find((s) => {
      const pid = typeof s.player === "object" ? s.player._id : s.player;
      return pid === playerId && s.type === type && s.season === season;
    });
    return stat?._id || null;
  };

  // Update stat (for editor)
  const updateStat = async (playerId: string, type: string, newValue: number) => {
    if (newValue < 0) return;
    const statId = getStatId(playerId, type);
    try {
      if (statId) {
        await api.patch(`/statistics/${statId}`, { value: newValue });
      } else {
        await api.post("/statistics", {
          club: clubId,
          player: playerId,
          type,
          value: newValue,
          season,
        });
      }
      await fetchStats();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update stat");
    }
  };

  // Filtered for search
  const filteredPlayers = searchQuery.trim()
    ? players.filter((p) => {
        const name = `${p.firstName} ${p.lastName}`.toLowerCase();
        const num = p.number ? `#${p.number}` : "";
        return name.includes(searchQuery.toLowerCase()) || num.includes(searchQuery);
      })
    : players;

  // Selected player stat value
  const getSelectedStatValue = (type: string): number => {
    if (!selectedPlayer) return 0;
    return getStatValue(selectedPlayer._id, type);
  };

  // Build ranking data — sort players by selected stat
  const rankingData = players
    .map((p) => ({
      player: p,
      goals: getStatValue(p._id, "GOALS"),
      assists: getStatValue(p._id, "ASSISTS"),
      appearances: getStatValue(p._id, "APPEARANCES"),
      minutes: getStatValue(p._id, "MINUTES_PLAYED"),
      cleanSheets: getStatValue(p._id, "CLEAN_SHEETS"),
      yellowCards: getStatValue(p._id, "YELLOW_CARDS"),
      redCards: getStatValue(p._id, "RED_CARDS"),
    }))
    .sort((a, b) => {
      const aVal = (a as any)[sortBy.toLowerCase()] || 0;
      const bVal = (b as any)[sortBy.toLowerCase()] || 0;
      return bVal - aVal;
    });

  const loading = loadingPlayers || loadingStats;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Player Statistics</h1>
        <p className="text-sm text-muted-foreground">{players.length} players • {season} season</p>
      </div>

      {/* ═══ PLAYER SEARCH EDITOR ═══ */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName} #${selectedPlayer.number || ""}` : searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedPlayer(null);
            }}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search player by name or number to edit stats..."
            className="pl-9 pr-9 h-10 text-sm"
          />
          {selectedPlayer && (
            <button
              onClick={() => { setSelectedPlayer(null); setSearchQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchFocused && !selectedPlayer && searchQuery.trim() && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-lg max-h-72 overflow-y-auto">
            {loadingPlayers ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No players found</div>
            ) : (
              filteredPlayers.slice(0, 20).map((player) => (
                <button
                  key={player._id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setSelectedPlayer(player);
                    setSearchQuery("");
                    setSearchFocused(false);
                  }}
                >
                  {player.photo ? (
                    <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border text-xs font-bold">
                      {player.firstName?.[0]}{player.lastName?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.firstName} {player.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {player.position?.replace(/_/g, " ")} {player.number ? `#${player.number}` : ""}
                    </p>
                  </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    ⚽ {getStatValue(player._id, "GOALS")} • 📈 {getStatValue(player._id, "ASSISTS")}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ═══ SELECTED PLAYER EDITOR ═══ */}
      {selectedPlayer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {selectedPlayer.photo ? (
                <img src={selectedPlayer.photo} alt="" className="w-10 h-10 rounded-full object-cover border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border text-base font-bold">
                  {selectedPlayer.firstName?.[0]}{selectedPlayer.lastName?.[0]}
                </div>
              )}
              <div>
                <CardTitle className="text-base">{selectedPlayer.firstName} {selectedPlayer.lastName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedPlayer.position?.replace(/_/g, " ")} {selectedPlayer.number ? `• #${selectedPlayer.number}` : ""} • {season}
                </p>
              </div>
            </div>

            {/* Mobile stats summary */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center">
                <p className="text-lg font-black text-green-600">{getSelectedStatValue("GOALS")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Goals</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-blue-600">{getSelectedStatValue("ASSISTS")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Assists</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-purple-600">{getSelectedStatValue("APPEARANCES")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Apps</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{getSelectedStatValue("GOALS")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Goals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{getSelectedStatValue("ASSISTS")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Assists</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-purple-600">{getSelectedStatValue("APPEARANCES")}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Apps</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {STAT_TYPES.map((stat) => {
                const value = getSelectedStatValue(stat.key);
                return (
                  <div
                    key={stat.key}
                    className={cn("flex items-center gap-2 p-2 rounded-xl border text-sm", stat.bg, stat.border)}
                  >
                    <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", stat.bg, stat.border)}>
                      <span className={stat.color + " h-3 w-3"}>{stat.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{stat.label}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateStat(selectedPlayer._id, stat.key, value - 1)}
                        disabled={value <= 0}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-10 h-8 flex items-center justify-center text-base font-black tabular-nums">
                        {value}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateStat(selectedPlayer._id, stat.key, value + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ RANKING TABLE ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Medal className="h-4 w-4 text-primary" />
              Player Rankings — {season}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Season */}
              <div className="flex items-center gap-1.5">
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowSeasonInput(!showSeasonInput)}
                  title="Add custom season"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showSeasonInput && (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newSeasonInput}
                    onChange={(e) => setNewSeasonInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomSeason()}
                    placeholder="e.g. 2024/25"
                    className="h-8 w-28 text-xs"
                    autoFocus
                  />
                  <Button variant="default" size="sm" className="h-8 text-xs" onClick={addCustomSeason}>
                    Add
                  </Button>
                </div>
              )}
              {/* Sort by */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              >                  <option value="GOALS">⚽ Goals</option>
                <option value="ASSISTS">📈 Assists</option>
                <option value="APPEARANCES">👥 Apps</option>
                <option value="MINUTES">⏱️ Minutes</option>
                <option value="CLEAN_SHEETS">🛡️ CS</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rankingData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No players found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px] text-center">#</TableHead>
                    <TableHead className="min-w-[120px]">Player</TableHead>
                    <TableHead className="w-[50px] text-center">⚽</TableHead>
                    <TableHead className="w-[50px] text-center">📈</TableHead>
                    <TableHead className="w-[45px] text-center">👥</TableHead>
                    <TableHead className="w-[60px] text-center">⏱️</TableHead>
                    <TableHead className="w-[40px] text-center">🛡️</TableHead>
                    <TableHead className="w-[40px] text-center">🟨</TableHead>
                    <TableHead className="w-[40px] text-center">🟥</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingData.map((row, idx) => {
                    const isTop3 = idx < 3;
                    const rankBadge = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
                    return (
                      <TableRow
                        key={row.player._id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          isTop3 && "bg-primary/5"
                        )}
                        onClick={() => setSelectedPlayer(row.player)}
                      >
                        <TableCell className="text-center font-bold">
                          {rankBadge}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.player.photo ? (
                              <img src={row.player.photo} alt="" className="w-6 h-6 rounded-full object-cover border shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border text-[8px] font-bold shrink-0">
                                {row.player.firstName?.[0]}{row.player.lastName?.[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{row.player.firstName} {row.player.lastName}</p>
                              <p className="text-[9px] text-muted-foreground">
                                {row.player.number ? `#${row.player.number}` : ""} {row.player.position?.replace(/_/g, " ").slice(0, 6)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-bold tabular-nums", row.goals > 0 ? "text-green-600" : "text-muted-foreground")}>
                            {row.goals}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-bold tabular-nums", row.assists > 0 ? "text-blue-600" : "text-muted-foreground")}>
                            {row.assists}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold tabular-nums">{row.appearances}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="tabular-nums text-muted-foreground">{row.minutes}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-bold tabular-nums", row.cleanSheets > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                            {row.cleanSheets}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("tabular-nums", row.yellowCards > 0 ? "text-yellow-600" : "text-muted-foreground")}>
                            {row.yellowCards}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("tabular-nums", row.redCards > 0 ? "text-red-600" : "text-muted-foreground")}>
                            {row.redCards}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StatisticsPage() {
  return <ClubGuard><StatisticsContent /></ClubGuard>;
}

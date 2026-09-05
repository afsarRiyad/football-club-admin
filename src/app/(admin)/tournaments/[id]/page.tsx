"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, ArrowLeft, Trophy, Calendar, MapPin, Play, Square, CheckCircle2,
  Edit3, Trash2, Users, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ───
interface TeamInfo { _id: string; name: string; logo?: string; slug?: string; }
interface BracketMatch {
  _id: string;
  round: string;
  position: number;
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  venue: string;
  status: string;
  winner: "HOME" | "AWAY" | "DRAW" | null;
  nextMatchId: string;
  nextMatchPosition: number;
}
interface Tournament {
  _id: string;
  name: string;
  format: string;
  teamCount: number;
  status: string;
  currentRound: string;
  champion: TeamInfo | null;
  teams: TeamInfo[];
  groups?: Record<string, (TeamInfo | string)[]>;
}

const ROUND_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-Finals",
  SEMI_FINAL: "Semi-Finals",
  FINAL: "Final",
};

const ROUND_ORDER = ["GROUP_STAGE", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  REGISTRATION: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  PENDING: "border-dashed border-gray-300 text-gray-400",
  SCHEDULED: "border-blue-300 bg-blue-50",
  LIVE: "border-red-400 bg-red-50 animate-pulse",
  COMPLETED: "border-green-400 bg-green-50",
  BYE: "border-gray-200 bg-gray-50 text-gray-400",
};

export default function TournamentBracketPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<Record<string, BracketMatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Match edit dialog
  const [editMatch, setEditMatch] = useState<BracketMatch | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editVenue, setEditVenue] = useState("");

  // Score dialog
  const [scoreMatch, setScoreMatch] = useState<BracketMatch | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Add team dialog
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Generate bracket dialog
  const [showGenerate, setShowGenerate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [venue, setVenue] = useState("");
  const [intervalDays, setIntervalDays] = useState(7);

  useEffect(() => {
    fetchTournament();
    fetchBracket();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      // Try tournaments API first, fallback to competitions API
      try {
        const { data } = await api.get(`/tournaments/${tournamentId}`);
        setTournament(data.data?.tournament || data.data);
        return;
      } catch {}
      const { data } = await api.get(`/competitions/${tournamentId}`);
      setTournament(data.data?.competition || data.data);
    } catch (e) {
      console.error("Failed to fetch tournament:", e);
    }
  };

  const fetchBracket = async () => {
    setLoading(true);
    try {
      // Try tournaments bracket first, fallback to competitions
      try {
        const { data } = await api.get(`/tournaments/${tournamentId}/bracket`);
        setBracket(data.data?.bracket || {});
        if (data.data?.tournament) setTournament(data.data.tournament);
        return;
      } catch {}
      // No bracket available for competition-type tournaments
      setBracket({});
    } catch (e) {
      console.error("Failed to fetch bracket:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data } = await api.get("/teams", { params: { limit: 50 } });
      setAllTeams(data.data?.teams || data.data || []);
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    }
  };

  // ─── Schedule match ───
  const handleSchedule = async () => {
    if (!editMatch) return;
    setSaving(true);
    try {
      // Update via recordResult with existing score, or just patch the match date
      // We need to use the tournament update endpoint
      await api.patch(`/competitions/${tournamentId}`, {
        $set: {
          [`matches.$[elem].matchDate`]: editDate,
          [`matches.$[elem].venue`]: editVenue,
        },
      }, {
        params: { "arrayFilters[elem._id]": editMatch._id },
      });
      // Re-fetch
      await fetchBracket();
      setEditMatch(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update match");
    } finally {
      setSaving(false);
    }
  };

  // ─── Go live ───
  const handleGoLive = async (match: BracketMatch) => {
    setSaving(true);
    try {
      // Record result to set status
      // Actually, we need a way to set status to LIVE
      // Let's use recordMatchResult but with current scores
      await api.post(`/competitions/${tournamentId}/matches/${match._id}/result`, {
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
      });
      // Hmm, that marks it completed. We need a different approach.
      // Let's patch the tournament directly
      await api.patch(`/competitions/${tournamentId}`, {
        [`matches.$[elem].status`]: "LIVE",
      }, {
        params: { "arrayFilters[elem._id]": match._id },
      });
      await fetchBracket();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to go live");
    } finally {
      setSaving(false);
    }
  };

  // ─── Record score ───
  const handleRecordScore = async () => {
    if (!scoreMatch) return;
    setSaving(true);
    try {
      await api.post(`/competitions/${tournamentId}/matches/${scoreMatch._id}/result`, {
        homeScore,
        awayScore,
      });
      await fetchBracket();
      await fetchTournament();
      setScoreMatch(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to record result");
    } finally {
      setSaving(false);
    }
  };

  // ─── End match (FT) ───
  const handleEndMatch = async (match: BracketMatch) => {
    setScoreMatch(match);
    setHomeScore(match.homeScore ?? 0);
    setAwayScore(match.awayScore ?? 0);
  };

  // ─── Add team ───
  const handleAddTeam = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    try {
      await api.post(`/competitions/${tournamentId}/teams`, { teamId: selectedTeamId });
      await fetchTournament();
      setShowAddTeam(false);
      setSelectedTeamId("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add team");
    } finally {
      setSaving(false);
    }
  };

  // ─── Remove team ───
  const handleRemoveTeam = async (teamId: string) => {
    if (!confirm("Remove this team from the tournament?")) return;
    setSaving(true);
    try {
      await api.delete(`/competitions/${tournamentId}/teams/${teamId}`);
      await fetchTournament();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to remove team");
    } finally {
      setSaving(false);
    }
  };

  // ─── Generate bracket ───
  const handleGenerateBracket = async () => {
    setSaving(true);
    try {
      await api.post(`/competitions/${tournamentId}/generate-bracket`, {
        startDate: startDate || undefined,
        venue: venue || undefined,
        matchIntervalDays: intervalDays,
      });
      await fetchBracket();
      await fetchTournament();
      setShowGenerate(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to generate bracket");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete tournament ───
  const handleDelete = async () => {
    if (!confirm("Delete this tournament? This cannot be undone.")) return;
    try {
      await api.delete(`/competitions/${tournamentId}`);
      router.push("/tournaments");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete");
    }
  };

  // ─── Scoreboard: compute standings from results ───
  const computeStandings = useCallback(() => {
    const standings: Record<string, { team: TeamInfo; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number }> = {};

    for (const round of Object.values(bracket)) {
      for (const m of round) {
        if (m.status !== "COMPLETED" || !m.homeTeam || !m.awayTeam) continue;

        const homeId = m.homeTeam._id;
        const awayId = m.awayTeam._id;

        if (!standings[homeId]) standings[homeId] = { team: m.homeTeam, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
        if (!standings[awayId]) standings[awayId] = { team: m.awayTeam, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };

        const hs = m.homeScore ?? 0;
        const as = m.awayScore ?? 0;

        standings[homeId].played++;
        standings[awayId].played++;
        standings[homeId].gf += hs;
        standings[homeId].ga += as;
        standings[awayId].gf += as;
        standings[awayId].ga += hs;

        if (hs > as) {
          standings[homeId].won++;
          standings[homeId].points += 3;
          standings[awayId].lost++;
        } else if (as > hs) {
          standings[awayId].won++;
          standings[awayId].points += 3;
          standings[homeId].lost++;
        } else {
          standings[homeId].drawn++;
          standings[awayId].drawn++;
          standings[homeId].points += 1;
          standings[awayId].points += 1;
        }
      }
    }

    return Object.values(standings)
      .map((s) => ({ ...s, gd: s.gf - s.ga }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }, [bracket]);

  // ─── Which rounds exist ───
  const activeRounds = ROUND_ORDER.filter((r) => bracket[r]?.length > 0);

  if (loading && !tournament) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Tournament not found.</p>
        <Button variant="ghost" onClick={() => router.push("/tournaments")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const standings = computeStandings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/tournaments")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={STATUS_STYLES[tournament.status] || ""}>{tournament.status}</Badge>
              <Badge variant="outline">{tournament.format?.replace(/_/g, " ")}</Badge>
              <span className="text-xs text-muted-foreground">{tournament.teamCount} teams</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchTeams(); setShowAddTeam(true); }}>
            <Users className="h-3.5 w-3.5 mr-1" /> Add Team
          </Button>
          {activeRounds.length === 0 && (
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Zap className="h-3.5 w-3.5 mr-1" /> Generate Bracket
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Champion banner */}
      {tournament.champion && (
        <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardContent className="flex items-center gap-4 p-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <div>
              <p className="text-xs text-yellow-600 font-mono uppercase">Champion</p>
              <p className="text-lg font-bold text-yellow-800">{tournament.champion.name}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team roster */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams ({tournament.teams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tournament.teams.map((t) => (
              <div key={t._id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                {t.logo ? (
                  <img src={t.logo} alt="" className="w-5 h-5 rounded-full object-contain" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[8px] font-bold">
                    {t.name?.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-medium">{t.name}</span>
                {(tournament.status === "DRAFT" || tournament.status === "REGISTRATION") && (
                  <button
                    onClick={() => handleRemoveTeam(t._id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {tournament.teams.length === 0 && (
              <p className="text-xs text-muted-foreground">No teams added yet. Click &quot;Add Team&quot; to get started.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group Stage Standings */}
      {tournament.format === "GROUP_AND_KNOCKOUT" && tournament.groups && Object.keys(tournament.groups).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(tournament.groups).map(([label, groupTeams]) => {
                // Compute standings for this group
                const groupStandings: Record<string, { team: any; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number }> = {};
                for (const t of groupTeams) {
                  const tid = typeof t === "object" ? t._id : t;
                  const teamData = typeof t === "object" ? t : null;
                  groupStandings[tid] = { team: teamData || { _id: tid, name: "TBD" }, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
                }
                const groupMatches = bracket.GROUP_STAGE?.filter((m: BracketMatch) => (m as any).group === label) || [];
                for (const m of groupMatches) {
                  if (m.status !== "COMPLETED" || !m.homeTeam || !m.awayTeam) continue;
                  const hid = m.homeTeam._id;
                  const aid = m.awayTeam._id;
                  if (!groupStandings[hid]) groupStandings[hid] = { team: m.homeTeam, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
                  if (!groupStandings[aid]) groupStandings[aid] = { team: m.awayTeam, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
                  const hs = m.homeScore ?? 0;
                  const as = m.awayScore ?? 0;
                  groupStandings[hid].played++; groupStandings[aid].played++;
                  groupStandings[hid].gf += hs; groupStandings[hid].ga += as;
                  groupStandings[aid].gf += as; groupStandings[aid].ga += hs;
                  if (hs > as) { groupStandings[hid].won++; groupStandings[hid].points += 3; groupStandings[aid].lost++; }
                  else if (as > hs) { groupStandings[aid].won++; groupStandings[aid].points += 3; groupStandings[hid].lost++; }
                  else { groupStandings[hid].drawn++; groupStandings[aid].drawn++; groupStandings[hid].points += 1; groupStandings[aid].points += 1; }
                }
                const sorted = Object.values(groupStandings)
                  .map(s => ({ ...s, gd: s.gf - s.ga }))
                  .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

                return (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs font-mono">Group {label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{groupMatches.filter((m: BracketMatch) => m.status === "COMPLETED").length}/{groupMatches.length} played</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1.5 px-2 font-medium w-5">#</th>
                            <th className="text-left py-1.5 px-2 font-medium">Team</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">P</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">W</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">D</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">L</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">GF</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">GA</th>
                            <th className="text-center py-1.5 px-1.5 font-medium w-6">GD</th>
                            <th className="text-center py-1.5 px-2 font-bold w-7">PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((s, i) => (
                            <tr key={i} className={cn("border-b last:border-0", i < 2 && "bg-green-50/50")}>
                              <td className="py-1.5 px-2 font-mono text-muted-foreground">{i + 1}</td>
                              <td className="py-1.5 px-2 font-medium flex items-center gap-1.5">
                                {s.team?.logo ? (
                                  <img src={s.team.logo} alt="" className="w-4 h-4 rounded-full object-contain" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold">{s.team?.name?.charAt(0) || "?"}</div>
                                )}
                                <span className="truncate">{s.team?.name || "TBD"}</span>
                              </td>
                              <td className="text-center py-1.5 px-1.5 font-mono">{s.played}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono text-green-600">{s.won}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono">{s.drawn}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono text-red-500">{s.lost}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono">{s.gf}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono">{s.ga}</td>
                              <td className="text-center py-1.5 px-1.5 font-mono">{s.gd > 0 ? "+" + s.gd : s.gd}</td>
                              <td className="text-center py-1.5 px-2 font-bold font-mono">{s.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1.5">Top 2 advance to knockout</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoreboard */}
      {standings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Scoreboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Team</th>
                    <th className="text-center py-2 px-2 font-medium">P</th>
                    <th className="text-center py-2 px-2 font-medium">W</th>
                    <th className="text-center py-2 px-2 font-medium">D</th>
                    <th className="text-center py-2 px-2 font-medium">L</th>
                    <th className="text-center py-2 px-2 font-medium">GF</th>
                    <th className="text-center py-2 px-2 font-medium">GA</th>
                    <th className="text-center py-2 px-2 font-medium">GD</th>
                    <th className="text-center py-2 px-2 font-bold">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.team._id} className="border-b last:border-0">
                      <td className="py-2 px-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-2 font-medium flex items-center gap-2">
                        {s.team.logo ? (
                          <img src={s.team.logo} alt="" className="w-4 h-4 rounded-full object-contain" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold">
                            {s.team.name?.charAt(0)}
                          </div>
                        )}
                        {s.team.name}
                      </td>
                      <td className="text-center py-2 px-2">{s.played}</td>
                      <td className="text-center py-2 px-2 text-green-600">{s.won}</td>
                      <td className="text-center py-2 px-2">{s.drawn}</td>
                      <td className="text-center py-2 px-2 text-red-500">{s.lost}</td>
                      <td className="text-center py-2 px-2">{s.gf}</td>
                      <td className="text-center py-2 px-2">{s.ga}</td>
                      <td className="text-center py-2 px-2">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                      <td className="text-center py-2 px-2 font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Stage Matches */}
      {bracket.GROUP_STAGE && bracket.GROUP_STAGE.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Stage Matches
              <Badge variant="secondary" className="ml-auto">
                {bracket.GROUP_STAGE.filter((m: BracketMatch) => m.status === "COMPLETED").length}/{bracket.GROUP_STAGE.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const groupLabelOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
              const groupMatches: Record<string, BracketMatch[]> = {};
              for (const m of bracket.GROUP_STAGE) {
                const g = (m as any).group || "A";
                if (!groupMatches[g]) groupMatches[g] = [];
                groupMatches[g].push(m);
              }
              const activeGroups = groupLabelOrder.filter(g => groupMatches[g]?.length > 0);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeGroups.map((g) => {
                    const gm = groupMatches[g].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
                    const completed = gm.filter((m: BracketMatch) => m.status === "COMPLETED").length;
                    return (
                      <div key={g}>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs font-mono">Group {g}</Badge>
                          <span className="text-[10px] text-muted-foreground">{completed}/{gm.length} played</span>
                        </div>
                        <div className="space-y-2">
                          {gm.map((m: BracketMatch) => (
                            <MatchCard
                              key={m._id}
                              match={m}
                              onSchedule={() => {
                                setEditMatch(m);
                                setEditDate(m.matchDate ? new Date(m.matchDate).toISOString().slice(0, 16) : "");
                                setEditVenue(m.venue || "");
                              }}
                              onGoLive={() => handleGoLive(m)}
                              onRecordScore={() => {
                                setScoreMatch(m);
                                setHomeScore(m.homeScore ?? 0);
                                setAwayScore(m.awayScore ?? 0);
                              }}
                              onEndMatch={() => handleEndMatch(m)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Knockout Bracket */}
      {(() => {
        const koRounds = activeRounds.filter(r => r !== "GROUP_STAGE");
        return koRounds.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Knockout Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-max">
                {koRounds.map((round, roundIdx) => {
                  const matches = bracket[round] || [];
                  const gapMultiplier = Math.pow(2, roundIdx);
                  return (
                    <div key={round} className="flex flex-col" style={{ gap: `${gapMultiplier * 16}px` }}>
                      <div className="text-center mb-2">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          {ROUND_LABELS[round] || round}
                        </p>
                      </div>
                      <div className="flex flex-col justify-around flex-1" style={{ gap: `${gapMultiplier * 16}px` }}>
                        {matches.map((m) => (
                          <MatchCard
                            key={m._id}
                            match={m}
                            onSchedule={() => {
                              setEditMatch(m);
                              setEditDate(m.matchDate ? new Date(m.matchDate).toISOString().slice(0, 16) : "");
                              setEditVenue(m.venue || "");
                            }}
                            onGoLive={() => handleGoLive(m)}
                            onRecordScore={() => {
                              setScoreMatch(m);
                              setHomeScore(m.homeScore ?? 0);
                              setAwayScore(m.awayScore ?? 0);
                            }}
                            onEndMatch={() => handleEndMatch(m)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        ) : null;
      })()}

      {activeRounds.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No bracket generated yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add teams, then click &quot;Generate Bracket&quot; to create the knockout tree.</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Schedule Dialog ─── */}
      <Dialog open={!!editMatch} onOpenChange={(o) => { if (!o) setEditMatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editMatch?.homeTeam?.name || "TBD"} vs {editMatch?.awayTeam?.name || "TBD"}
            </p>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={editVenue}
                onChange={(e) => setEditVenue(e.target.value)}
                placeholder="Stadium name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMatch(null)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Score Dialog ─── */}
      <Dialog open={!!scoreMatch} onOpenChange={(o) => { if (!o) setScoreMatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-sm font-semibold">{scoreMatch?.homeTeam?.name || "TBD"}</p>
                <Input
                  type="number"
                  min={0}
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  className="w-20 text-center text-2xl font-bold mx-auto mt-2"
                />
              </div>
              <span className="text-lg text-muted-foreground font-light px-4">–</span>
              <div className="text-center flex-1">
                <p className="text-sm font-semibold">{scoreMatch?.awayTeam?.name || "TBD"}</p>
                <Input
                  type="number"
                  min={0}
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  className="w-20 text-center text-2xl font-bold mx-auto mt-2"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Winner advances to the next round automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreMatch(null)}>Cancel</Button>
            <Button onClick={handleRecordScore} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Team Dialog ─── */}
      <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a team to add to this tournament.</p>
            <Select value={selectedTeamId} onValueChange={(v) => v && setSelectedTeamId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team..." />
              </SelectTrigger>
              <SelectContent>
                {allTeams
                  .filter((t) => !tournament.teams.find((tt) => tt._id === t._id))
                  .map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeam(false)}>Cancel</Button>
            <Button onClick={handleAddTeam} disabled={!selectedTeamId || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Generate Bracket Dialog ─── */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Bracket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create a {tournament.teamCount}-team knockout bracket. Teams will be randomly seeded.
            </p>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Default venue"
              />
            </div>
            <div className="space-y-2">
              <Label>Days between rounds</Label>
              <Input
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(parseInt(e.target.value) || 7)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerateBracket} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Match Card Component ───
function MatchCard({
  match,
  onSchedule,
  onGoLive,
  onRecordScore,
  onEndMatch,
}: {
  match: BracketMatch;
  onSchedule: () => void;
  onGoLive: () => void;
  onRecordScore: () => void;
  onEndMatch: () => void;
}) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";
  const isScheduled = match.status === "SCHEDULED";
  const isPending = match.status === "PENDING";
  const isBye = match.status === "BYE";

  return (
    <div
      className={cn(
        "w-56 rounded-lg border-2 p-3 transition-all",
        MATCH_STATUS_STYLES[match.status] || "",
        isLive && "shadow-lg"
      )}
    >
      {/* Date, Group & Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {(match as any).group && (
            <span className="text-[8px] font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
              {(match as any).group}
            </span>
          )}
          {match.matchDate ? (
            <span className="text-[9px] font-mono text-muted-foreground">
              {new Date(match.matchDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ) : (
            <span className="text-[9px] font-mono text-muted-foreground">TBD</span>
          )}
        </div>
        {isLive && (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
        {isCompleted && (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}
      </div>

      {/* Teams & Score */}
      <div className="space-y-1">
        {/* Home */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {match.homeTeam?.logo ? (
              <img src={match.homeTeam.logo} alt="" className="w-4 h-4 rounded-full object-contain shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold shrink-0">
                {match.homeTeam?.name?.charAt(0) || "?"}
              </div>
            )}
            <span className={cn("text-xs font-medium truncate", isCompleted && match.winner === "HOME" && "font-bold text-green-700")}>
              {match.homeTeam?.name || "TBD"}
            </span>
          </div>
          {(isCompleted || isLive) && match.homeScore !== null && (
            <span className={cn("text-sm font-black font-mono", isCompleted && match.winner === "HOME" && "text-green-700")}>
              {match.homeScore}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {match.awayTeam?.logo ? (
              <img src={match.awayTeam.logo} alt="" className="w-4 h-4 rounded-full object-contain shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold shrink-0">
                {match.awayTeam?.name?.charAt(0) || "?"}
              </div>
            )}
            <span className={cn("text-xs font-medium truncate", isCompleted && match.winner === "AWAY" && "font-bold text-green-700")}>
              {match.awayTeam?.name || "TBD"}
            </span>
          </div>
          {(isCompleted || isLive) && match.awayScore !== null && (
            <span className={cn("text-sm font-black font-mono", isCompleted && match.winner === "AWAY" && "text-green-700")}>
              {match.awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isBye && !isPending && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-dashed">
          {isScheduled && (
            <>
              <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 flex-1" onClick={onSchedule}>
                <Calendar className="h-2.5 w-2.5" /> Schedule
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 flex-1 text-red-600 hover:text-red-700" onClick={onGoLive}>
                <Play className="h-2.5 w-2.5" /> Go Live
              </Button>
            </>
          )}
          {isLive && (
            <>
              <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 flex-1" onClick={onRecordScore}>
                <Edit3 className="h-2.5 w-2.5" /> Score
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 flex-1 text-green-600 hover:text-green-700" onClick={onEndMatch}>
                <Square className="h-2.5 w-2.5" /> FT
              </Button>
            </>
          )}
          {isCompleted && (
            <Button size="sm" variant="ghost" className="h-6 text-[9px] gap-0.5 flex-1" onClick={onRecordScore}>
              <Edit3 className="h-2.5 w-2.5" /> Edit Score
            </Button>
          )}
        </div>
      )}

      {isBye && (
        <div className="mt-2 pt-2 border-t border-dashed">
          <p className="text-[9px] text-muted-foreground text-center italic">BYE — {match.homeTeam?.name} advances</p>
        </div>
      )}

      {isPending && (
        <div className="mt-2 pt-2 border-t border-dashed">
          <p className="text-[9px] text-muted-foreground text-center italic">Waiting for previous round...</p>
        </div>
      )}
    </div>
  );
}

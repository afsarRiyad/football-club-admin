"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Trophy, Swords, Loader2, Trash2, Eye, ChevronLeft, ChevronRight,
  X, Shield, Check, Calendar, Pencil, Save, Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import { TableRowsSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";
import { LiveMatchPanel } from "@/components/admin/live-match-panel";
import { useClub } from "@/lib/use-club";
import { Tournament } from "@/types";

// ─── Interactive Bracket View ───────────────────────────────────────

interface BracketViewProps {
  tournament: Tournament;
  onRecordResult?: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
  onLiveClick?: (matchId: string) => void;
}

function BracketView({ tournament, onRecordResult, onLiveClick }: BracketViewProps) {
  const rounds = getRounds(tournament.teamCount);
  const matchesByRound: Record<string, any[]> = {};

  (tournament.matches || []).forEach((m) => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });

  Object.keys(matchesByRound).forEach((round) => {
    matchesByRound[round].sort((a: any, b: any) => a.position - b.position);
  });

  // Editing state — tracks which match is being edited and its scores
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editHomeScore, setEditHomeScore] = useState("0");
  const [editAwayScore, setEditAwayScore] = useState("0");
  const [saving, setSaving] = useState(false);

  const startEditing = (match: any) => {
    setEditingMatchId(match._id);
    setEditHomeScore(String(match.homeScore ?? 0));
    setEditAwayScore(String(match.awayScore ?? 0));
  };

  const cancelEditing = () => {
    setEditingMatchId(null);
  };

  const submitScore = async (matchId: string) => {
    if (!onRecordResult) return;
    setSaving(true);
    try {
      await onRecordResult(matchId, parseInt(editHomeScore) || 0, parseInt(editAwayScore) || 0);
      setEditingMatchId(null);
    } catch (e) {
      console.error("Failed to record result:", e);
    } finally {
      setSaving(false);
    }
  };

  const getTeamName = (team: any) => {
    if (!team) return "TBD";
    if (typeof team === "string") return "TBD";
    return team.name || "TBD";
  };

  const getTeamLogo = (team: any): string => {
    if (!team || typeof team === "string") return "";
    return team.logo || "";
  };

  const matchStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 border-green-300 text-green-800";
      case "LIVE": return "bg-red-100 border-red-300 text-red-800";
      case "SCHEDULED": return "bg-blue-50 border-blue-200";
      case "PENDING": return "bg-gray-50 border-gray-200";
      case "BYE": return "bg-yellow-50 border-yellow-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max items-start">
        {rounds.map((round) => {
          const matches = matchesByRound[round] || [];
          const gapMultiplier = rounds.indexOf(round);
          return (
            <div key={round} className="flex flex-col items-center" style={{ marginTop: gapMultiplier * 24 }}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 whitespace-nowrap">
                {round.replace(/_/g, " ")}
              </h3>
              <div className="flex flex-col gap-4" style={{ gap: `${Math.pow(2, gapMultiplier) * 16 + 16}px` }}>
                {matches.map((match: any, idx: number) => {
                  const isHomeWinner = match.status === "COMPLETED" && match.winner === "HOME";
                  const isAwayWinner = match.status === "COMPLETED" && match.winner === "AWAY";
                  const isEditing = editingMatchId === match._id;
                  const canEdit = (match.status === "SCHEDULED" || match.status === "LIVE" || match.status === "COMPLETED")
                    && match.homeTeam && match.awayTeam && onRecordResult;

                  return (
                    <div key={match._id || idx} className={`rounded-lg border-2 ${matchStatusColor(match.status)} w-56 ${canEdit && !isEditing ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
                      onClick={() => { if (canEdit && !isEditing) startEditing(match); }}
                    >
                      {/* Home Team */}
                      <div className={`flex items-center gap-2 px-3 py-2 border-b ${isHomeWinner ? "bg-green-200/50" : ""}`}>
                        {getTeamLogo(match.homeTeam) && (
                          <img src={getTeamLogo(match.homeTeam)} alt="" className="w-5 h-5 rounded object-contain" />
                        )}
                        <span className={`flex-1 text-sm truncate ${isHomeWinner ? "font-bold" : ""}`}>
                          {getTeamName(match.homeTeam)}
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editHomeScore}
                            onChange={(e) => setEditHomeScore(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 text-center text-sm font-mono font-bold bg-white border rounded px-1 py-0.5"
                          />
                        ) : match.status === "COMPLETED" ? (
                          <span className={`text-sm font-mono font-bold ${isHomeWinner ? "text-green-700" : ""}`}>
                            {match.homeScore ?? 0}
                          </span>
                        ) : canEdit ? (
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-50" />
                        ) : null}
                      </div>
                      {/* Away Team */}
                      <div className={`flex items-center gap-2 px-3 py-2 ${isAwayWinner ? "bg-green-200/50" : ""}`}>
                        {getTeamLogo(match.awayTeam) && (
                          <img src={getTeamLogo(match.awayTeam)} alt="" className="w-5 h-5 rounded object-contain" />
                        )}
                        <span className={`flex-1 text-sm truncate ${isAwayWinner ? "font-bold" : ""}`}>
                          {getTeamName(match.awayTeam)}
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editAwayScore}
                            onChange={(e) => setEditAwayScore(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 text-center text-sm font-mono font-bold bg-white border rounded px-1 py-0.5"
                          />
                        ) : match.status === "COMPLETED" ? (
                          <span className={`text-sm font-mono font-bold ${isAwayWinner ? "text-green-700" : ""}`}>
                            {match.awayScore ?? 0}
                          </span>
                        ) : canEdit ? (
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-50" />
                        ) : null}
                      </div>

                      {/* Score entry buttons (shown when editing) */}
                      {isEditing && (
                        <div className="flex border-t" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 text-xs py-1.5 text-muted-foreground hover:bg-muted transition-colors rounded-bl-lg"
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <div className="w-px bg-border" />
                          <button
                            onClick={() => submitScore(match._id)}
                            className="flex-1 text-xs py-1.5 text-green-700 font-medium hover:bg-green-50 transition-colors rounded-br-lg flex items-center justify-center gap-1"
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </button>
                        </div>
                      )}

                      {/* Match date + live button */}
                      {!isEditing && (
                        <div className="flex items-center justify-between px-3 py-1 border-t">
                          {match.matchDate ? (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(match.matchDate).toLocaleDateString()}
                            </span>
                          ) : <span />}
                          {onLiveClick && match.homeTeam && match.awayTeam && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onLiveClick(match._id); }}
                              className={`text-[10px] flex items-center gap-0.5 transition-colors ${
                                match.status === "LIVE" || match.status === "HT"
                                  ? "text-red-500 hover:text-red-600"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Radio className="h-3 w-3" />
                              Live
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getRounds(teamCount: number): string[] {
  if (teamCount <= 2) return ["FINAL"];
  if (teamCount <= 4) return ["SEMI_FINAL", "FINAL"];
  if (teamCount <= 8) return ["QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
  if (teamCount <= 16) return ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
  return ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
}

/** Compute the date for each round given a start date and interval */
function computeRoundDates(startDate: string, intervalDays: number, teamCount: number): Record<string, string> {
  if (!startDate) return {};
  const rounds = getRounds(teamCount);
  const result: Record<string, string> = {};
  rounds.forEach((round, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * intervalDays);
    result[round] = d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  });
  return result;
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function TournamentsPage() {
  const { clubId } = useClub();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterRound, setFilterRound] = useState<string | null>(null);
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const router = useRouter();

  // Create form state
  const [formStep, setFormStep] = useState(0); // 0=info, 1=teams, 2=review
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formTeamCount, setFormTeamCount] = useState(4);
  const [formTeams, setFormTeams] = useState<string[]>(["", "", "", ""]);
  const [formMatchIntervalDays, setFormMatchIntervalDays] = useState(7);

  // Teams from backend
  const [availableTeams, setAvailableTeams] = useState<{ _id: string; name: string }[]>([]);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      const { data: res } = await api.get("/tournaments", { params });
      setTournaments((res.data || []) as Tournament[]);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (e) {
      console.error("Failed to fetch tournaments:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  // Fetch teams when create dialog opens
  const openCreateDialog = async () => {
    try {
      const { data } = await api.get("/teams", { params: { limit: 500 } });
      setAvailableTeams((data.data || []).map((t: any) => ({ _id: t._id, name: t.name })));
    } catch {
      setAvailableTeams([]);
    }
    setFormName("");
    setFormDescription("");
    setFormVenue("");
    setFormStartDate("");
    setFormEndDate("");
    setFormTeamCount(4);
    setFormTeams(["", "", "", ""]);
    setFormMatchIntervalDays(7);
    setFormStep(0);
    setCreateOpen(true);
  };

  const handleTeamCountChange = (count: number) => {
    setFormTeamCount(count);
    setFormTeams(Array(count).fill(""));
  };

  const submitCreate = async () => {
    setSubmitting(true);
    try {
      const selectedTeams = formTeams.filter(Boolean);

      // Create the tournament with its team size so the bracket fits
      const tournamentData: any = {
        club: clubId,
        name: formName,
        format: "SINGLE_KNOCKOUT",
        teamCount: formTeamCount,
        startDate: formStartDate || undefined,
        endDate: formEndDate || undefined,
        venue: formVenue || undefined,
        description: formDescription || undefined,
        matchIntervalDays: formMatchIntervalDays,
      };

      const { data: res } = await api.post("/tournaments", tournamentData);
      const tournamentId = res.data.tournament._id;

      // Add selected teams
      for (const teamId of selectedTeams) {
        try {
          await api.post(`/tournaments/${tournamentId}/teams`, { teamId });
        } catch (e) {
          console.error("Failed to add team:", e);
        }
      }

      // Generate bracket with auto-scheduling
      try {
        await api.post(`/tournaments/${tournamentId}/generate-bracket`, {
          startDate: formStartDate || undefined,
          venue: formVenue || undefined,
          matchIntervalDays: formMatchIntervalDays,
        });
      } catch {
        console.log("Bracket generation endpoint not available yet");
      }

      setCreateOpen(false);
      fetchTournaments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create tournament");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.delete(`/tournaments/${selected._id}`);
      setDeleteOpen(false);
      fetchTournaments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  // Record match result from bracket view
  const handleRecordResult = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!selected) return;
    try {
      const { data: res } = await api.post(`/tournaments/${selected._id}/matches/${matchId}/result`, {
        homeScore,
        awayScore,
      });
      // Update the selected tournament with the new data
      setSelected(res.data.tournament);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to record result");
      throw e;
    }
  };

  const roundDates = computeRoundDates(formStartDate, formMatchIntervalDays, formTeamCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">{total} total</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" /> Create Tournament
        </Button>
      </div>

      {/* Tournament List */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsSkeleton rows={5} cols={5} />
              ) : tournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0 border-0">
                    <EmptyState
                      icon={Swords}
                      title="No tournaments found"
                      message="Tournaments you create will show up here — click &quot;Create Tournament&quot; to start one."
                      className="py-10"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                tournaments.map((t) => (
                  <TableRow key={t._id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{t.format?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{t.teams?.length || 0} / {t.teamCount}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "IN_PROGRESS" ? "default" : t.status === "COMPLETED" ? "secondary" : "outline"}>
                        {t.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/tournaments/${t._id}`)} title="Open Bracket">
                          <Swords className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(t); setViewOpen(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(t); setDeleteOpen(true); }} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Tournament Dialog ─────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {["Tournament Info", "Select Teams", "Review & Create"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < formStep ? "bg-green-500 text-white" : i === formStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i < formStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${i === formStep ? "font-medium" : "text-muted-foreground"}`}>{step}</span>
                {i < 2 && <div className={`w-8 h-px ${i < formStep ? "bg-green-500" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Tournament Info */}
          {formStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tournament Name <span className="text-destructive">*</span></Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Summer Cup 2026" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Annual summer tournament..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input value={formVenue} onChange={(e) => setFormVenue(e.target.value)} placeholder="City Stadium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Teams</Label>
                  <Select value={String(formTeamCount)} onValueChange={(v) => handleTeamCountChange(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 4, 8, 16, 32].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} Teams</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Days Between Rounds</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={formMatchIntervalDays}
                    onChange={(e) => setFormMatchIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>
              {/* Schedule preview */}
              {formStartDate && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Auto-Scheduled Dates ({formMatchIntervalDays} day{formMatchIntervalDays !== 1 ? "s" : ""} between rounds)
                  </div>
                  <div className="space-y-1">
                    {getRounds(formTeamCount).map((round) => (
                      <div key={round} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{round.replace(/_/g, " ")}</span>
                        <span className="font-medium">{roundDates[round]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Select Teams */}
          {formStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select {formTeamCount} teams for the tournament bracket.
              </p>
              <div className="grid gap-3">
                {formTeams.map((teamId, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-8">#{i + 1}</span>
                    {availableTeams.length > 0 ? (
                      <Select value={teamId || ""} onValueChange={(v) => {
                        const newTeams = [...formTeams];
                        newTeams[i] = v || "";
                        setFormTeams(newTeams);
                      }}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={`Select team ${i + 1}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map((t) => (
                            <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="flex-1"
                        value={teamId}
                        onChange={(e) => {
                          const newTeams = [...formTeams];
                          newTeams[i] = e.target.value;
                          setFormTeams(newTeams);
                        }}
                        placeholder={`Team ${i + 1} name`}
                      />
                    )}
                    {teamId && (
                      <button onClick={() => {
                        const newTeams = [...formTeams];
                        newTeams[i] = "";
                        setFormTeams(newTeams);
                      }} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>{formTeams.filter(Boolean).length} / {formTeamCount} teams selected</span>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {formStep === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tournament:</span>
                  <span className="font-medium">{formName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">Single Elimination ({formTeamCount} teams)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rounds:</span>
                  <span className="font-medium">{getRounds(formTeamCount).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Matches:</span>
                  <span className="font-medium">{formTeamCount - 1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Match Interval:</span>
                  <span className="font-medium">{formMatchIntervalDays} day{formMatchIntervalDays !== 1 ? "s" : ""} between rounds</span>
                </div>
              </div>

              {/* Schedule preview */}
              {formStartDate && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Match Schedule
                  </div>
                  <div className="space-y-1">
                    {getRounds(formTeamCount).map((round) => {
                      const matchCount = formTeamCount / Math.pow(2, getRounds(formTeamCount).indexOf(round) + 1);
                      return (
                        <div key={round} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{round.replace(/_/g, " ")} ({matchCount} match{matchCount !== 1 ? "es" : ""})</span>
                          <span className="font-medium">{roundDates[round]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bracket Preview */}
              <div className="border rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Bracket Preview</p>
                <div className="flex gap-4">
                  {getRounds(formTeamCount).map((round, ri) => {
                    const matchCount = formTeamCount / Math.pow(2, ri + 1);
                    return (
                      <div key={round} className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-2">{round.replace(/_/g, " ")}</p>
                        <div className="flex flex-col gap-1">
                          {Array.from({ length: matchCount }).map((_, mi) => (
                            <div key={mi} className="border rounded px-2 py-1 text-[10px] bg-muted/50">
                              TBD vs TBD
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {formStep > 0 ? (
              <Button variant="outline" onClick={() => setFormStep(formStep - 1)}>Back</Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              {formStep < 2 ? (
                <Button onClick={() => setFormStep(formStep + 1)} disabled={formStep === 0 && !formName}>
                  Next
                </Button>
              ) : (
                <Button onClick={submitCreate} disabled={submitting || !formName}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Tournament
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Tournament Dialog ───────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={(open) => { setViewOpen(open); if (!open) setFilterRound(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="text-sm font-medium">{selected.format?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teams</p>
                  <p className="text-sm font-medium">{selected.teams?.length || 0} / {selected.teamCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selected.status === "IN_PROGRESS" ? "default" : "secondary"}>
                    {selected.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matches</p>
                  <p className="text-sm font-medium">{selected.matches?.length || 0}</p>
                </div>
              </div>

              {/* Champion banner */}
              {selected.champion && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Champion</p>
                    <p className="text-sm font-bold">{typeof selected.champion === "object" ? selected.champion.name : "TBD"}</p>
                  </div>
                </div>
              )}

              {/* Bracket with score entry */}
              {selected.matches && selected.matches.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold">Tournament Bracket</h3>
                    <p className="text-[10px] text-muted-foreground">Click a match to enter scores</p>
                  </div>
                  <BracketView tournament={selected} onRecordResult={handleRecordResult} onLiveClick={(id) => setLiveMatchId(id)} />
                </div>
              )}

              {/* Matches Table */}
              {selected.matches && selected.matches.length > 0 && (() => {
                const realMatches = selected.matches.filter((m) => m.status !== "BYE");
                const roundOrder = getRounds(selected.teamCount);
                const roundsPresent = [...new Set(realMatches.map((m) => m.round))]
                  .sort((a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b));
                const completedCount = realMatches.filter((m) => m.status === "COMPLETED").length;
                const filteredMatches = filterRound
                  ? realMatches.filter((m) => m.round === filterRound)
                  : realMatches;
                const sortedMatches = [...filteredMatches].sort((a, b) => {
                  const ri = roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
                  if (ri !== 0) return ri;
                  return (a.position ?? 0) - (b.position ?? 0);
                });
                return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">All Matches</h3>
                      <p className="text-[10px] text-muted-foreground">{completedCount} / {realMatches.length} completed</p>
                    </div>
                    {/* Round filter tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterRound(null)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          !filterRound
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        All ({realMatches.length})
                      </button>
                      {roundsPresent.map((round) => {
                        const count = realMatches.filter((m) => m.round === round).length;
                        const completedInRound = realMatches.filter((m) => m.round === round && m.status === "COMPLETED").length;
                        return (
                          <button
                            key={round}
                            onClick={() => setFilterRound(filterRound === round ? null : round)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                              filterRound === round
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {round.replace(/_/g, " ")} ({completedInRound}/{count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Round</TableHead>
                        <TableHead>Home</TableHead>
                        <TableHead className="w-20 text-center">Score</TableHead>
                        <TableHead>Away</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMatches
                        .map((match: any) => {
                          const homeName = typeof match.homeTeam === "object" && match.homeTeam
                            ? match.homeTeam.name : "TBD";
                          const awayName = typeof match.awayTeam === "object" && match.awayTeam
                            ? match.awayTeam.name : "TBD";
                          const isHomeWin = match.status === "COMPLETED" && match.winner === "HOME";
                          const isAwayWin = match.status === "COMPLETED" && match.winner === "AWAY";
                          return (
                            <TableRow key={match._id} className={match.status === "COMPLETED" ? "bg-green-50/50" : ""}>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {match.round.replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {typeof match.homeTeam === "object" && match.homeTeam?.logo && (
                                    <img src={match.homeTeam.logo} alt="" className="w-4 h-4 rounded object-contain" />
                                  )}
                                  <span className={`text-sm ${isHomeWin ? "font-bold" : homeName === "TBD" ? "text-muted-foreground italic" : ""}`}>{homeName}</span>
                                  {isHomeWin && <span className="text-[10px] text-green-600 font-bold">W</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {match.status === "COMPLETED" ? (
                                  <span className="text-sm font-mono font-bold">{match.homeScore ?? 0} — {match.awayScore ?? 0}</span>
                                ) : match.status === "SCHEDULED" || match.status === "LIVE" ? (
                                  <span className="text-xs text-muted-foreground">vs</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {typeof match.awayTeam === "object" && match.awayTeam?.logo && (
                                    <img src={match.awayTeam.logo} alt="" className="w-4 h-4 rounded object-contain" />
                                  )}
                                  <span className={`text-sm ${isAwayWin ? "font-bold" : awayName === "TBD" ? "text-muted-foreground italic" : ""}`}>{awayName}</span>
                                  {isAwayWin && <span className="text-[10px] text-green-600 font-bold">W</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {match.matchDate
                                    ? new Date(match.matchDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                                    : "TBD"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    match.status === "COMPLETED" ? "default"
                                    : match.status === "LIVE" ? "destructive"
                                    : match.status === "SCHEDULED" ? "secondary"
                                    : "outline"
                                  }
                                  className="text-[10px]"
                                >
                                  {match.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
                );
              })()}

              {/* Teams List */}
              {selected.teams && selected.teams.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3">Participating Teams</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selected.teams.map((team: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
                        <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                        {typeof team === "object" && team.logo ? (
                          <img src={team.logo} alt="" className="w-5 h-5 rounded object-contain" />
                        ) : null}
                        <span>{typeof team === "object" ? team.name : team}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Live Match Panel ────────────────────────────────── */}
      <Dialog open={!!liveMatchId} onOpenChange={(open) => { if (!open) setLiveMatchId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {liveMatchId && (
                <>
                  <Radio className="h-4 w-4 text-red-500" />
                  Live Match Control
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {liveMatchId && (() => {
            const match = selected?.matches?.find((m: any) => m._id === liveMatchId);
            const homeName = match && typeof match.homeTeam === "object" ? match.homeTeam?.name : "TBD";
            const awayName = match && typeof match.awayTeam === "object" ? match.awayTeam?.name : "TBD";
            return (
              <div>
                <p className="text-sm font-medium mb-3">{homeName} vs {awayName}</p>
                <LiveMatchPanel
                  matchId={liveMatchId}
                  status={match?.status || "SCHEDULED"}
                  score={{ home: match?.homeScore ?? 0, away: match?.awayScore ?? 0 }}
                  onUpdate={() => {
                    // Re-fetch tournament to get updated data
                    if (selected) {
                      api.get(`/tournaments/${selected._id}`).then(({ data }) => {
                        setSelected(data.data?.tournament || data.data);
                      }).catch(() => {});
                    }
                  }}
                />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this tournament? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

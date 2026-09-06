"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveMatchPanel } from "@/components/admin/live-match-panel";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import api from "@/lib/api";
import { Match } from "@/types";
import {
  Plus, Search, Radio, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Calendar,
} from "lucide-react";
import { MobileListSkeleton, TableRowsSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import toast from "react-hot-toast";

interface TeamOption {
  _id: string;
  name: string;
}

function MatchesContent() {
  const { clubId } = useClub();

  // Data
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Teams for dropdowns
  const [teams, setTeams] = useState<TeamOption[]>([]);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formHomeTeam, setFormHomeTeam] = useState("");
  const [formAwayTeam, setFormAwayTeam] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formKickoff, setFormKickoff] = useState("15:00");
  const [formStatus, setFormStatus] = useState("SCHEDULED");
  const [formHomeScore, setFormHomeScore] = useState(0);
  const [formAwayScore, setFormAwayScore] = useState(0);
  const [formVenueName, setFormVenueName] = useState("");
  const [formVenueAddress, setFormVenueAddress] = useState("");
  const [formAttendance, setFormAttendance] = useState("");
  const [formReferee, setFormReferee] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchTeams = useCallback(async () => {
    try {
      // Fetch all teams (for away opponents) + your club's teams (for home)
      const { data } = await api.get("/teams", { params: { limit: 500 } });
      setTeams((data.data || []).map((t: any) => ({ _id: t._id, name: t.name })));
    } catch { setTeams([]); }
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (clubId) params.club = clubId;
      const { data: res } = await api.get("/matches", { params });
      setMatches(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (e) {
      console.error("Failed to fetch matches:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, clubId]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const getTeamName = (team: any): string => {
    if (!team) return "TBD";
    if (typeof team === "string") return teams.find((t) => t._id === team)?.name || "TBD";
    return team.name || "TBD";
  };

  const resetForm = () => {
    setFormHomeTeam("");
    setFormAwayTeam("");
    setFormDate("");
    setFormKickoff("15:00");
    setFormStatus("SCHEDULED");
    setFormHomeScore(0);
    setFormAwayScore(0);
    setFormVenueName("");
    setFormVenueAddress("");
    setFormAttendance("");
    setFormReferee("");
    setFormNotes("");
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (match: Match) => {
    setSelected(match);
    setFormHomeTeam(typeof match.homeTeam === "string" ? match.homeTeam : match.homeTeam?._id || "");
    setFormAwayTeam(typeof match.awayTeam === "string" ? match.awayTeam : match.awayTeam?._id || "");
    setFormDate(match.matchDate ? new Date(match.matchDate).toISOString().slice(0, 16) : "");
    setFormKickoff(match.kickoff || "15:00");
    setFormStatus(match.status || "SCHEDULED");
    setFormHomeScore(match.score?.home || 0);
    setFormAwayScore(match.score?.away || 0);
    setFormVenueName(match.venue?.name || "");
    setFormVenueAddress(match.venue?.address || "");
    setFormAttendance(match.attendance?.toString() || "");
    setFormReferee(match.referee || "");
    setFormNotes(match.notes || "");
    setEditOpen(true);
  };

  const buildPayload = () => ({
    club: clubId,
    homeTeam: formHomeTeam,
    awayTeam: formAwayTeam,
    matchDate: formDate ? new Date(formDate).toISOString() : undefined,
    kickoff: formKickoff,
    status: formStatus,
    score: { home: formHomeScore, away: formAwayScore },
    venue: { name: formVenueName, address: formVenueAddress },
    attendance: formAttendance ? parseInt(formAttendance) : undefined,
    referee: formReferee,
    notes: formNotes,
  });

  const handleCreate = async () => {
    if (!formHomeTeam || !formAwayTeam || !formDate) {
      toast.error("Home team, away team, and date are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/matches", buildPayload());
      setCreateOpen(false);
      fetchMatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create match");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.patch(`/matches/${selected._id}`, buildPayload());
      setEditOpen(false);
      fetchMatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update match");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.delete(`/matches/${selected._id}`);
      setDeleteOpen(false);
      fetchMatches();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl">Matches</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button onClick={openCreate} className="gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Match
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <MobileListSkeleton items={4} />
        ) : matches.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No matches found"
            message="Scheduled matches will show up here — use the &quot;Add Match&quot; button to create the first one."
            className="py-10"
          />
        ) : (
          matches.map((m) => (
            <Card key={m._id} className={`${liveMatch?._id === m._id ? "border-red-500/50 bg-red-500/5" : ""} hover:border-primary/50 transition-colors`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {getTeamName(m.homeTeam)} <span className="text-muted-foreground">vs</span> {getTeamName(m.awayTeam)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{new Date(m.matchDate).toLocaleDateString()}</span>
                      {m.venue?.name && <span>📍 {m.venue.name}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold">{m.score?.home ?? 0} - {m.score?.away ?? 0}</div>
                    <Badge variant={
                      m.status === "LIVE" ? "destructive" :
                      m.status === "FT" ? "default" : "secondary"
                    } className="mt-1">
                      {m.status === "LIVE" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                      {m.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setLiveMatch(liveMatch?._id === m._id ? null : m)} title="Live control"
                    className={liveMatch?._id === m._id ? "text-red-500 bg-red-500/10" : m.status === "LIVE" || m.status === "HT" ? "text-red-500" : ""}>
                    <Radio className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Live</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(m); setDeleteOpen(true); }}
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
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
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search matches..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRowsSkeleton rows={5} cols={6} />
                ) : matches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0 border-0">
                      <EmptyState
                        icon={Calendar}
                        title="No matches found"
                        message="Scheduled matches will show up here — use the &quot;Add Match&quot; button to create the first one."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  matches.map((m) => (
                    <TableRow key={m._id}
                      className={liveMatch?._id === m._id ? "bg-red-500/5 border-l-2 border-l-red-500" : ""}>
                      <TableCell className="font-medium">
                        {getTeamName(m.homeTeam)} vs {getTeamName(m.awayTeam)}
                      </TableCell>
                      <TableCell>{m.score?.home ?? 0} - {m.score?.away ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={
                          m.status === "LIVE" ? "destructive" :
                          m.status === "FT" ? "default" : "secondary"
                        }>
                          {m.status === "LIVE" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(m.matchDate).toLocaleDateString()}</TableCell>
                      <TableCell>{m.venue?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setLiveMatch(liveMatch?._id === m._id ? null : m)} title="Live control"
                            className={liveMatch?._id === m._id ? "text-red-500 bg-red-500/10" : m.status === "LIVE" || m.status === "HT" ? "text-red-500" : ""}>
                            <Radio className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelected(m); setDeleteOpen(true); }}
                            className="text-destructive hover:text-destructive">
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
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2"><DialogTitle>Create Match</DialogTitle></DialogHeader>
          <div className="px-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            <MatchForm
              onSubmit={handleCreate}
              submitLabel="Create Match"
              teams={teams}
              formHomeTeam={formHomeTeam} setFormHomeTeam={setFormHomeTeam}
              formAwayTeam={formAwayTeam} setFormAwayTeam={setFormAwayTeam}
              formDate={formDate} setFormDate={setFormDate}
              formKickoff={formKickoff} setFormKickoff={setFormKickoff}
              formStatus={formStatus} setFormStatus={setFormStatus}
              formHomeScore={formHomeScore} setFormHomeScore={setFormHomeScore}
              formAwayScore={formAwayScore} setFormAwayScore={setFormAwayScore}
              formVenueName={formVenueName} setFormVenueName={setFormVenueName}
              formVenueAddress={formVenueAddress} setFormVenueAddress={setFormVenueAddress}
              formAttendance={formAttendance} setFormAttendance={setFormAttendance}
              formReferee={formReferee} setFormReferee={setFormReferee}
              formNotes={formNotes} setFormNotes={setFormNotes}
              submitting={submitting}
              onCancel={() => { setCreateOpen(false); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2"><DialogTitle>Edit Match</DialogTitle></DialogHeader>
          <div className="px-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            <MatchForm
              onSubmit={handleEdit}
              submitLabel="Save Changes"
              teams={teams}
              formHomeTeam={formHomeTeam} setFormHomeTeam={setFormHomeTeam}
              formAwayTeam={formAwayTeam} setFormAwayTeam={setFormAwayTeam}
              formDate={formDate} setFormDate={setFormDate}
              formKickoff={formKickoff} setFormKickoff={setFormKickoff}
              formStatus={formStatus} setFormStatus={setFormStatus}
              formHomeScore={formHomeScore} setFormHomeScore={setFormHomeScore}
              formAwayScore={formAwayScore} setFormAwayScore={setFormAwayScore}
              formVenueName={formVenueName} setFormVenueName={setFormVenueName}
              formVenueAddress={formVenueAddress} setFormVenueAddress={setFormVenueAddress}
              formAttendance={formAttendance} setFormAttendance={setFormAttendance}
              formReferee={formReferee} setFormReferee={setFormReferee}
              formNotes={formNotes} setFormNotes={setFormNotes}
              submitting={submitting}
              onCancel={() => { setEditOpen(false); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Match Inline Section */}
      {liveMatch && (
        <Card className="border-2 border-red-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {liveMatch.status === "LIVE" && <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />}
                {getTeamName(liveMatch.homeTeam)} vs {getTeamName(liveMatch.awayTeam)}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLiveMatch(null)}>
                ✕ Close
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>{new Date(liveMatch.matchDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {liveMatch.kickoff && <span>Kickoff: {liveMatch.kickoff}</span>}
              {liveMatch.venue?.name && <span>📍 {liveMatch.venue.name}</span>}
              {liveMatch.referee && <span>Referee: {liveMatch.referee}</span>}
              {liveMatch.attendance && <span>👥 {liveMatch.attendance.toLocaleString()}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <LiveMatchPanel
              matchId={liveMatch._id}
              status={liveMatch.status}
              score={liveMatch.score || { home: 0, away: 0 }}
              homeTeamId={typeof liveMatch.homeTeam === "string" ? liveMatch.homeTeam : liveMatch.homeTeam?._id}
              awayTeamId={typeof liveMatch.awayTeam === "string" ? liveMatch.awayTeam : liveMatch.awayTeam?._id}
              onUpdate={async () => {
                await fetchMatches();
                // Also refresh the liveMatch state so the header updates
                if (liveMatch) {
                  try {
                    const { data } = await api.get(`/matches/${liveMatch._id}`);
                    const updated = data.data?.match;
                    if (updated) setLiveMatch(updated);
                  } catch {}
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this match?</p>
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


/* ── Team select (extracted to prevent remount on parent re-render) ── */
const TeamSelect = ({
  value,
  onChange,
  label,
  required,
  teams,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
  teams: TeamOption[];
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
    >
      <option value="">Select {label}</option>
      {teams.map((t) => (
        <option key={t._id} value={t._id}>{t.name}</option>
      ))}
    </select>
  </div>
);

/* ── Match form (extracted to prevent remount on parent re-render) ── */
const MatchForm = React.memo(({
  onSubmit,
  submitLabel,
  teams,
  formHomeTeam, setFormHomeTeam,
  formAwayTeam, setFormAwayTeam,
  formDate, setFormDate,
  formKickoff, setFormKickoff,
  formStatus, setFormStatus,
  formHomeScore, setFormHomeScore,
  formAwayScore, setFormAwayScore,
  formVenueName, setFormVenueName,
  formVenueAddress, setFormVenueAddress,
  formAttendance, setFormAttendance,
  formReferee, setFormReferee,
  formNotes, setFormNotes,
  submitting,
  onCancel,
}: {
  onSubmit: () => void;
  submitLabel: string;
  teams: TeamOption[];
  formHomeTeam: string; setFormHomeTeam: (v: string) => void;
  formAwayTeam: string; setFormAwayTeam: (v: string) => void;
  formDate: string; setFormDate: (v: string) => void;
  formKickoff: string; setFormKickoff: (v: string) => void;
  formStatus: string; setFormStatus: (v: string) => void;
  formHomeScore: number; setFormHomeScore: (v: number) => void;
  formAwayScore: number; setFormAwayScore: (v: number) => void;
  formVenueName: string; setFormVenueName: (v: string) => void;
  formVenueAddress: string; setFormVenueAddress: (v: string) => void;
  formAttendance: string; setFormAttendance: (v: string) => void;
  formReferee: string; setFormReferee: (v: string) => void;
  formNotes: string; setFormNotes: (v: string) => void;
  submitting: boolean;
  onCancel: () => void;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <TeamSelect value={formHomeTeam} onChange={setFormHomeTeam} label="Home Team" required teams={teams} />
      <TeamSelect value={formAwayTeam} onChange={setFormAwayTeam} label="Away Team" required teams={teams} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Match Date <span className="text-destructive">*</span></Label>
        <Input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Kickoff Time</Label>
        <Input value={formKickoff} onChange={(e) => setFormKickoff(e.target.value)} placeholder="15:00" />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Status</Label>
      <select
        value={formStatus}
        onChange={(e) => setFormStatus(e.target.value)}
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        {["SCHEDULED", "LIVE", "HT", "FT", "POSTPONED", "CANCELLED"].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
        ))}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Home Score</Label>
        <Input type="number" min={0} value={formHomeScore}
          onChange={(e) => setFormHomeScore(parseInt(e.target.value) || 0)} />
      </div>
      <div className="space-y-2">
        <Label>Away Score</Label>
        <Input type="number" min={0} value={formAwayScore}
          onChange={(e) => setFormAwayScore(parseInt(e.target.value) || 0)} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Venue Name</Label>
        <Input value={formVenueName} onChange={(e) => setFormVenueName(e.target.value)} placeholder="Stadium name" />
      </div>
      <div className="space-y-2">
        <Label>Venue Address</Label>
        <Input value={formVenueAddress} onChange={(e) => setFormVenueAddress(e.target.value)} placeholder="Address" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Attendance</Label>
        <Input type="number" min={0} value={formAttendance}
          onChange={(e) => setFormAttendance(e.target.value)} placeholder="30000" />
      </div>
      <div className="space-y-2">
        <Label>Referee</Label>
        <Input value={formReferee} onChange={(e) => setFormReferee(e.target.value)} placeholder="Referee name" />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Notes</Label>
      <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Match notes..." />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSubmit} disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {submitLabel}
      </Button>
    </DialogFooter>
  </div>
));

export default function MatchesPage() {
  return <ClubGuard><MatchesContent /></ClubGuard>;
}

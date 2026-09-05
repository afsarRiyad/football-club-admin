"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { PlayerCard, calcOVR } from "@/components/admin/player-card";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Player, Team } from "@/types";
import { Eye, MoreHorizontal, Shield, ShieldOff, Star, StarOff, ArrowRightLeft, Trash2, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-1 min-w-[42px]">
      <span className="text-[10px] font-bold text-muted-foreground w-7">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-5 text-right">{value}</span>
    </div>
  );
}

function getStatColor(val: number) {
  if (val >= 80) return "bg-green-500";
  if (val >= 65) return "bg-emerald-400";
  if (val >= 50) return "bg-yellow-400";
  if (val >= 35) return "bg-orange-400";
  return "bg-red-400";
}

function getOVRBadgeColor(ovr: number) {
  if (ovr >= 85) return "bg-yellow-500 text-white";
  if (ovr >= 75) return "bg-green-600 text-white";
  if (ovr >= 60) return "bg-emerald-500 text-white";
  if (ovr >= 45) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

const columns: Column<Player>[] = [
  { key: "number", label: "#", render: (item) => item.number || "—" },
  {
    key: "ovr",
    label: "OVR",
    className: "w-14",
    render: (item) => {
      const ovr = calcOVR({ pac: item.pac, sho: item.sho, pas: item.pas, dri: item.dri, def: item.def, phy: item.phy });
      return (
        <span className={`inline-flex items-center justify-center h-7 min-w-[28px] rounded-md text-xs font-black ${getOVRBadgeColor(ovr)}`}>
          {ovr}
        </span>
      );
    },
  },
  { key: "name", label: "Name", render: (item) => `${item.firstName} ${item.lastName}` },
  { key: "position", label: "Position" },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={item.status === "ACTIVE" ? "default" : item.status === "INJURED" ? "destructive" : "secondary"}>
        {item.status}
      </Badge>
    ),
  },
  {
    key: "stats",
    label: "Stats",
    className: "min-w-[280px]",
    render: (item) => (
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-2">
          <StatBar label="PAC" value={item.pac ?? 50} color={getStatColor(item.pac ?? 50)} />
          <StatBar label="SHO" value={item.sho ?? 50} color={getStatColor(item.sho ?? 50)} />
          <StatBar label="PAS" value={item.pas ?? 50} color={getStatColor(item.pas ?? 50)} />
        </div>
        <div className="flex gap-2">
          <StatBar label="DRI" value={item.dri ?? 50} color={getStatColor(item.dri ?? 50)} />
          <StatBar label="DEF" value={item.def ?? 50} color={getStatColor(item.def ?? 50)} />
          <StatBar label="PHY" value={item.phy ?? 50} color={getStatColor(item.phy ?? 50)} />
        </div>
      </div>
    ),
  },
  { key: "nationality", label: "Nationality", render: (item) => item.nationality || "—" },
];

function PlayersContent() {
  const [cardPlayer, setCardPlayer] = useState<Player | null>(null);
  const { clubId } = useClub();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<{ _id: string; name: string }[]>([]);
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<"" | "captain" | "viceCaptain" | "transfer" | "delete">("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  // Bulk import state
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkClubId, setBulkClubId] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<any>(null);

  // Fetch clubs for the club selector
  useEffect(() => {
    api.get("/clubs", { params: { limit: 50 } })
      .then(({ data }) => {
        const clubList = data.data || [];
        setClubs(clubList);
      })
      .catch(() => {});
  }, []);

  // Fetch teams for captain/viceCaptain actions
  useEffect(() => {
    if (clubId) {
      api.get("/teams", { params: { club: clubId, limit: 50 } })
        .then(({ data }) => setTeams(data.data?.teams || data.data || []))
        .catch(() => {});
    }
  }, [clubId]);

  const fields: FieldConfig[] = [
    { key: "firstName", label: "First Name", type: "text", required: true },
    { key: "lastName", label: "Last Name", type: "text", required: true },
    { key: "number", label: "Jersey Number", type: "number", placeholder: "10", min: 1, max: 99 },
    { key: "position", label: "Position", type: "select", required: true, options: [
      { value: "GOALKEEPER", label: "Goalkeeper" }, { value: "DEFENDER", label: "Defender" },
      { value: "MIDFIELDER", label: "Midfielder" }, { value: "FORWARD", label: "Forward" },
    ]},
    { key: "club", label: "Club", type: "select", required: true,
      options: clubs.map((c) => ({ value: c._id, label: c.name })),
    },
    { key: "team", label: "Add to Team", type: "select",
      options: [
        { value: "", label: "— None (Club Pool only)" },
        ...teams.map((t) => ({ value: t._id, label: t.name })),
      ],
    },
    { key: "subPosition", label: "Sub Position", type: "select", options: [
      { value: "CENTRE_BACK", label: "Centre Back" }, { value: "LEFT_BACK", label: "Left Back" },
      { value: "RIGHT_BACK", label: "Right Back" }, { value: "DEFENSIVE_MIDFIELDER", label: "Defensive Midfielder" },
      { value: "CENTRAL_MIDFIELDER", label: "Central Midfielder" }, { value: "ATTACKING_MIDFIELDER", label: "Attacking Midfielder" },
      { value: "LEFT_WINGER", label: "Left Winger" }, { value: "RIGHT_WINGER", label: "Right Winger" },
      { value: "STRIKER", label: "Striker" }, { value: "SECOND_STRIKER", label: "Second Striker" },
    ]},
    { key: "status", label: "Status", type: "select", options: [
      { value: "ACTIVE", label: "Active" }, { value: "INJURED", label: "Injured" },
      { value: "SUSPENDED", label: "Suspended" }, { value: "LOANED", label: "Loaned" },
      { value: "INACTIVE", label: "Inactive" },
    ]},
    { key: "nationality", label: "Nationality", type: "text" },
    { key: "dateOfBirth", label: "Date of Birth", type: "date", max: new Date().toISOString().split("T")[0] },
    { key: "height", label: "Height (cm)", type: "number", min: 100, max: 250 },
    { key: "weight", label: "Weight (kg)", type: "number", min: 30, max: 200 },
    { key: "preferredFoot", label: "Preferred Foot", type: "select", options: [
      { value: "RIGHT", label: "Right" }, { value: "LEFT", label: "Left" }, { value: "BOTH", label: "Both" },
    ]},
    { key: "photo", label: "Player Photo", type: "file", accept: "image/*", uploadType: "photo" },
    { key: "bio", label: "Bio", type: "textarea" },
    { key: "pac", label: "PAC — Pace (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
    { key: "sho", label: "SHO — Shooting (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
    { key: "pas", label: "PAS — Passing (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
    { key: "dri", label: "DRI — Dribbling (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
    { key: "def", label: "DEF — Defending (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
    { key: "phy", label: "PHY — Physical (0–99)", type: "number", placeholder: "50", min: 0, max: 99 },
  ];

  const handleAction = async () => {
    if (!actionPlayer || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "captain" || actionType === "viceCaptain") {
        const teamId = selectedTeamId || teams[0]?._id;
        if (!teamId) { toast.error("No team found. Create a team first."); setActionLoading(false); return; }
        const field = actionType === "captain" ? "captain" : "viceCaptain";
        await api.patch(`/teams/${teamId}`, { [field]: actionPlayer._id });
        toast.success(`${actionPlayer.firstName} ${actionPlayer.lastName} is now ${actionType === "captain" ? "Captain" : "Vice Captain"}!`);
      } else if (actionType === "delete") {
        if (!confirm(`Delete ${actionPlayer.firstName} ${actionPlayer.lastName}? This cannot be undone.`)) {
          setActionLoading(false); return;
        }
        await api.delete(`/players/${actionPlayer._id}`);
        window.location.reload();
      }
      setActionPlayer(null);
      setActionType("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkClubId || !bulkText.trim()) {
      toast.error("Please select a club and enter player data.");
      return;
    }

    setBulkImporting(true);
    setBulkResults(null);
    try {
      // Parse text: one player per line, format: firstName lastName position number
      const lines = bulkText.trim().split("\n").filter((l) => l.trim());
      const playersData = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const [firstName, lastName, position, number] = parts;
        return {
          firstName: firstName || "",
          lastName: lastName || "",
          position: position?.toUpperCase() || "MIDFIELDER",
          number: number ? parseInt(number, 10) : undefined,
          club: bulkClubId,
          status: "ACTIVE",
        };
      });

      const { data } = await api.post("/players/bulk-import", { players: playersData });
      setBulkResults(data);
      if (data.results?.created > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Bulk import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <>
      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Import Players
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Club *</Label>
              <Select value={bulkClubId} onValueChange={(v) => v && setBulkClubId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose club for all players..." />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Player Data (one per line) *</Label>
              <p className="text-xs text-muted-foreground">
                Format: <code className="bg-muted px-1 rounded">FirstName, LastName, Position, Number</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Positions: GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD
              </p>
              <textarea
                className="w-full h-48 p-3 text-sm font-mono border rounded-lg bg-background resize-none"
                placeholder={`John Smith, DEFENDER, 4
Maria Garcia, MIDFIELDER, 8
Ahmed Hassan, FORWARD, 10
Carlos Lopez, GOALKEEPER, 1`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={bulkImporting}
              />
            </div>
            {bulkResults && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">
                  ✅ Created: {bulkResults.results?.created || 0} / {bulkResults.results?.total || 0}
                </p>
                {bulkResults.results?.failed > 0 && (
                  <p className="text-sm text-destructive">
                    ❌ Failed: {bulkResults.results.failed}
                  </p>
                )}
                {bulkResults.data?.errors?.map((err: any, i: number) => (
                  <p key={i} className="text-xs text-destructive">• Row {err.index + 1}: {err.error}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkImportOpen(false); setBulkText(""); setBulkResults(null); }}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkClubId || !bulkText.trim()}>
              {bulkImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Players</h1>
          <p className="text-muted-foreground">Manage your club's players</p>
        </div>
        <Button variant="outline" onClick={() => { setBulkClubId(clubId || ""); setBulkImportOpen(true); }} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Bulk Import
        </Button>
      </div>

      <DataTable<Player>
        title="Players"
        endpoint="/players"
        columns={columns}
        fields={fields}
        searchPlaceholder="Search players..."
        createTitle="Add Player"
        editTitle="Edit Player"
        defaultPayload={clubId ? { club: clubId } : undefined}
        imageField="photo"
        onCreate={async (data) => {
          const { team: teamId, ...playerData } = data;
          // Create the player first
          const { data: res } = await api.post("/players", playerData);
          const newPlayer = res.data?.player;

          // If a team was selected, add the player to that team
          if (teamId && newPlayer?._id) {
            try {
              const { data: teamRes } = await api.get(`/teams/${teamId}`);
              const team = teamRes.data?.team || teamRes.data;
              const existingPlayerIds = (team.players || []).map((p: any) =>
                typeof p === "string" ? p : p._id
              ).filter(Boolean);
              if (!existingPlayerIds.includes(newPlayer._id)) {
                await api.patch(`/teams/${teamId}`, {
                  players: [...existingPlayerIds, newPlayer._id],
                });
              }
            } catch (e) {
              console.error("Failed to add player to team:", e);
            }
          }

          toast.success(`Player created${teamId ? " and added to team" : ""} successfully!`);
        }}
        renderRowActions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCardPlayer(item)}>
                <Eye className="h-3.5 w-3.5 mr-2" /> View Card
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setActionPlayer(item); setActionType("captain"); }}>
                <Shield className="h-3.5 w-3.5 mr-2" /> Make Captain
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActionPlayer(item); setActionType("viceCaptain"); }}>
                <Star className="h-3.5 w-3.5 mr-2" /> Make Vice Captain
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setActionPlayer(item); setActionType("delete"); }} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Player
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Player Card Dialog */}
      <Dialog open={!!cardPlayer} onOpenChange={(open) => { if (!open) setCardPlayer(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Player Card</DialogTitle>
          </DialogHeader>
          {cardPlayer && (
            <div className="flex justify-center py-4">
              <PlayerCard
                firstName={cardPlayer.firstName}
                lastName={cardPlayer.lastName}
                number={cardPlayer.number}
                position={cardPlayer.position}
                photo={cardPlayer.photo}
                stats={{
                  pac: cardPlayer.pac,
                  sho: cardPlayer.sho,
                  pas: cardPlayer.pas,
                  dri: cardPlayer.dri,
                  def: cardPlayer.def,
                  phy: cardPlayer.phy,
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Captain / Vice Captain Action Dialog */}
      <Dialog open={!!actionPlayer && (actionType === "captain" || actionType === "viceCaptain")} onOpenChange={(o) => { if (!o) { setActionPlayer(null); setActionType(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "captain" ? "🛡️ Make Captain" : "⭐ Make Vice Captain"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign <strong>{actionPlayer?.firstName} {actionPlayer?.lastName}</strong> as {actionType === "captain" ? "Captain" : "Vice Captain"} of:
            </p>
            {teams.length > 1 ? (
              <div className="space-y-2">
                <Label>Select Team</Label>
                <Select value={selectedTeamId || teams[0]?._id || ""} onValueChange={(v) => v && setSelectedTeamId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : teams.length === 1 ? (
              <p className="text-sm font-medium">{teams[0].name}</p>
            ) : (
              <p className="text-sm text-destructive">No teams found. Create a team first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionPlayer(null); setActionType(""); }}>Cancel</Button>
            <Button onClick={handleAction} disabled={actionLoading || teams.length === 0}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!actionPlayer && actionType === "delete"} onOpenChange={(o) => { if (!o) { setActionPlayer(null); setActionType(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{actionPlayer?.firstName} {actionPlayer?.lastName}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionPlayer(null); setActionType(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleAction} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PlayersPage() {
  return (
    <ClubGuard>
      <PlayersContent />
    </ClubGuard>
  );
}

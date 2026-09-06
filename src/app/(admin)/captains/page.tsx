"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Shield, Star, User, Users, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Player, Team } from "@/types";
import { PageSkeleton } from "@/components/ui/skeleton";

/* ── Player card for captain selection ── */
function PlayerRow({
  player,
  isCaptain,
  isViceCaptain,
  onSetCaptain,
  onSetViceCaptain,
}: {
  player: Player;
  isCaptain: boolean;
  isViceCaptain: boolean;
  onSetCaptain: () => void;
  onSetViceCaptain: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isCaptain && "border-yellow-500 bg-yellow-500/5",
        isViceCaptain && "border-blue-500 bg-blue-500/5",
        !isCaptain && !isViceCaptain && "border-border hover:border-muted-foreground/30"
      )}
    >
      {/* Avatar */}
      {player.photo ? (
        <img
          src={player.photo}
          alt=""
          className="w-10 h-10 rounded-full object-cover border"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border">
          <span className="text-xs font-bold">
            {player.firstName?.[0]}
            {player.lastName?.[0]}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {player.firstName} {player.lastName}
          </p>
          {isCaptain && (
            <Badge className="bg-yellow-500 text-white text-[10px] gap-1">
              <Crown className="h-2.5 w-2.5" /> Captain
            </Badge>
          )}
          {isViceCaptain && (
            <Badge className="bg-blue-500 text-white text-[10px] gap-1">
              <Star className="h-2.5 w-2.5" /> Vice Captain
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {player.position?.replace(/_/g, " ")}{" "}
          {player.number ? `• #${player.number}` : ""}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isCaptain ? "default" : "outline"}
          className={cn(
            "gap-1 h-8 text-xs",
            isCaptain && "bg-yellow-500 hover:bg-yellow-600 text-white"
          )}
          onClick={onSetCaptain}
        >
          <Crown className="h-3 w-3" />
          {isCaptain ? "Remove Captain" : "Make Captain"}
        </Button>
        <Button
          size="sm"
          variant={isViceCaptain ? "default" : "outline"}
          className={cn(
            "gap-1 h-8 text-xs",
            isViceCaptain && "bg-blue-500 hover:bg-blue-600 text-white"
          )}
          onClick={onSetViceCaptain}
        >
          <Star className="h-3 w-3" />
          {isViceCaptain ? "Remove Vice" : "Make Vice Captain"}
        </Button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function CaptainsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const { data } = await api.get("/teams", { params: { limit: 50 } });
      const teamList = data.data?.teams || data.data || [];
      setTeams(teamList);
      if (teamList.length > 0) {
        const senior = teamList.find((t: Team) => t.category === "SENIOR");
        setSelectedTeamId(senior?._id || teamList[0]._id);
      }
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadTeamData = async (teamId: string) => {
    setLoading(true);
    try {
      const { data: teamData } = await api.get(`/teams/${teamId}`);
      const t = teamData.data?.team || teamData.data;
      setTeam(t);

      // Load current captain and vice captain
      const cap = t.captain;
      if (typeof cap === "string") setCaptainId(cap);
      else if (cap && typeof cap === "object") setCaptainId(cap._id);
      else setCaptainId(null);

      const vc = t.viceCaptain;
      if (typeof vc === "string") setViceCaptainId(vc);
      else if (vc && typeof vc === "object") setViceCaptainId(vc._id);
      else setViceCaptainId(null);

      // Use players already populated from GET /teams/:id
      const teamPlayers: Player[] = (t.players || []).map((p: any) => {
        // If player is a full object, use it directly
        if (typeof p === "object" && p._id) return p as Player;
        // If it's just an ID string, we don't have the data — shouldn't happen
        return null;
      }).filter(Boolean) as Player[];

      if (teamPlayers.length > 0) {
        setPlayers(teamPlayers);
      } else {
        // Fallback: fetch all club players if team.players is empty
        const clubId =
          typeof t.club === "object" ? t.club?._id || t.club : t.club;
        const params: any = { limit: 100 };
        if (clubId) params.club = clubId;
        const { data: clubData } = await api.get("/players", { params });
        setPlayers(clubData.data || []);
      }
    } catch (e) {
      console.error("Failed to load team:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCaptain = (playerId: string) => {
    if (captainId === playerId) {
      // Remove captain
      setCaptainId(null);
      toast.success("Captain removed");
    } else {
      // If this player is vice captain, remove them from vice
      if (viceCaptainId === playerId) setViceCaptainId(null);
      setCaptainId(playerId);
      const p = players.find((pl) => pl._id === playerId);
      toast.success(`${p?.firstName} ${p?.lastName} set as Captain`);
    }
  };

  const handleSetViceCaptain = (playerId: string) => {
    if (viceCaptainId === playerId) {
      // Remove vice captain
      setViceCaptainId(null);
      toast.success("Vice Captain removed");
    } else {
      // If this player is captain, remove them from captain
      if (captainId === playerId) setCaptainId(null);
      setViceCaptainId(playerId);
      const p = players.find((pl) => pl._id === playerId);
      toast.success(`${p?.firstName} ${p?.lastName} set as Vice Captain`);
    }
  };

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (captainId) payload.captain = captainId;
      else payload.captain = null;
      if (viceCaptainId) payload.viceCaptain = viceCaptainId;
      else payload.viceCaptain = null;

      await api.patch(`/teams/${team._id}`, payload);
      toast.success("Captaincy saved successfully!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const captainPlayer = players.find((p) => p._id === captainId);
  const viceCaptainPlayer = players.find((p) => p._id === viceCaptainId);

  if (loading || loadingTeams) {
    return <PageSkeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Captain & Vice Captain</h1>
          <p className="text-muted-foreground">
            Assign leadership roles for your team
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !team}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Team selector */}
      {teams.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">
            Team:
          </span>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-64 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">Select a team...</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} {t.category === "SENIOR" ? "⭐" : ""}
              </option>
            ))}
          </select>
          <Badge variant="outline">{players.length} players</Badge>
        </div>
      )}

      {/* Current leaders summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className={cn(captainPlayer ? "border-yellow-500/50" : "")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Captain
                </p>
                {captainPlayer ? (
                  <p className="text-sm font-semibold">
                    {captainPlayer.firstName} {captainPlayer.lastName}
                    {captainPlayer.number ? ` #${captainPlayer.number}` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Not assigned
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(viceCaptainPlayer ? "border-blue-500/50" : "")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Vice Captain
                </p>
                {viceCaptainPlayer ? (
                  <p className="text-sm font-semibold">
                    {viceCaptainPlayer.firstName} {viceCaptainPlayer.lastName}
                    {viceCaptainPlayer.number
                      ? ` #${viceCaptainPlayer.number}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Not assigned
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Players ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No players found in this team
            </p>
          ) : (
            <div className="space-y-2">
              {players
                .sort((a, b) => {
                  // Show captain first, then vice captain, then by position
                  if (a._id === captainId) return -1;
                  if (b._id === captainId) return 1;
                  if (a._id === viceCaptainId) return -1;
                  if (b._id === viceCaptainId) return 1;
                  const posOrder: Record<string, number> = {
                    GOALKEEPER: 0,
                    DEFENDER: 1,
                    MIDFIELDER: 2,
                    FORWARD: 3,
                  };
                  return (
                    (posOrder[a.position] ?? 99) -
                    (posOrder[b.position] ?? 99)
                  );
                })
                .map((player) => (
                  <PlayerRow
                    key={player._id}
                    player={player}
                    isCaptain={player._id === captainId}
                    isViceCaptain={player._id === viceCaptainId}
                    onSetCaptain={() => handleSetCaptain(player._id)}
                    onSetViceCaptain={() => handleSetViceCaptain(player._id)}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

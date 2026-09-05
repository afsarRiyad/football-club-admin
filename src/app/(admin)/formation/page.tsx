"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import api from "@/lib/api";
import { Player, Team, Match } from "@/types";
import { getFormation, getFormationOptions, FIELD_SIZES, FieldSize, Formation, FormationSlot } from "@/lib/formations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Shield, Shirt, ArrowRight, X, RotateCcw, Crown, Calendar, ChevronDown, Users, UserMinus, Filter, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

/* ── Match Formation type from API ── */
interface MatchFormationEntry {
  _id: string;
  match: Match;
  team: Team;
  formation: string;
  playerCount: number; // 5, 7, 9, or 11
  startingXI: { player: Player; position: string; slotIndex: number }[];
  captain?: Player;
  bench?: Player[];
}

/* ── Player item in the pool ── */
function DraggablePlayer({
  player,
  isCaptain,
  onSetCaptain,
  onAddToBench,
}: {
  player: Player;
  isCaptain: boolean;
  onSetCaptain: () => void;
  onAddToBench: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player._id}`,
    data: { player },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all",
        "bg-surface hover:bg-muted",
        isDragging && "opacity-50 z-50",
        isCaptain && "border-yellow-500/50 bg-yellow-500/5"
      )}
    >
      {player.photo ? (
        <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
          <span className="text-xs font-bold">{player.firstName?.[0]}{player.lastName?.[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{player.firstName} {player.lastName}</p>
        <p className="text-[10px] text-muted-foreground font-mono">
          {player.position?.replace(/_/g, " ")} {player.number ? `#${player.number}` : ""}
        </p>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onSetCaptain(); }}
          className={cn(
            "p-1 rounded transition-colors",
            isCaptain ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:text-yellow-500"
          )}
          title="Set as captain"
        >
          <Crown className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddToBench(); }}
          className="p-1 rounded transition-colors text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10"
          title="Add to bench"
        >
          <Shirt className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Pitch slot (droppable + draggable player) ── */
function PitchSlot({
  slot,
  index,
  player,
  isCaptain,
  onRemove,
  onRemoveFromTeam,
  onSetCaptain,
}: {
  slot: FormationSlot;
  index: number;
  player?: Player;
  isCaptain: boolean;
  onRemove: () => void;
  onRemoveFromTeam: () => void;
  onSetCaptain: () => void;
}) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: player ? `pitch-player-${player._id}` : `empty-slot-${index}`,
    data: { player, fromSlot: index },
    disabled: !player,
  });

  const dragStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const combinedRef = (node: HTMLDivElement | null) => {
    setDropRef(node);
    if (player) setDragRef(node);
  };

  return (
    <div
      ref={combinedRef}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-20 group",
        "transition-all duration-200",
        isOver && "scale-110 z-30",
        isDragging && "opacity-40"
      )}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      <div className="relative flex flex-col items-center" style={dragStyle}>
        {isCaptain && player && (
          <div className="absolute -top-3 -right-1 z-20">
            <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
              <Crown className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
        )}

        <div
          {...(player ? { ...attributes, ...listeners } : {})}
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all",
            player
              ? "bg-club-primary border-white/40 shadow-lg cursor-grab active:cursor-grabbing"
              : "bg-white/10 border-dashed border-white/30",
            isOver && "border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]",
            isCaptain && "border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.4)]"
          )}
        >
          {player?.photo ? (
            <img src={player.photo} alt="" className="w-full h-full rounded-full object-cover" />
          ) : player ? (
            <span className="text-white font-bold text-sm pointer-events-none">{player.firstName?.[0]}</span>
          ) : (
            <span className="text-white/40 text-[10px] font-mono font-bold">{slot.role}</span>
          )}
        </div>

        <div className="mt-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-center max-w-[80px]">
          <p className="text-[10px] font-bold text-white truncate leading-tight">
            {player ? `${player.firstName?.charAt(0)}. ${player.lastName}` : slot.role}
          </p>
          {player?.number && (
            <p className="text-[8px] text-white/60 font-mono">#{player.number}</p>
          )}
        </div>

        {player && (
          <div className="absolute -top-1 -left-1 flex gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove ${player.firstName} ${player.lastName} from pitch?\n\nClick OK to remove from pitch only.\nClick Cancel, then hold Shift + click to also remove from team.`)) {
                  onRemove();
                }
              }}
              className="w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              title="Remove from pitch (Shift+Click to also remove from team)"
            >
              <X className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  if (confirm(`Remove ${player.firstName} ${player.lastName} from team completely?`)) {
                    onRemoveFromTeam();
                  }
                } else {
                  onSetCaptain();
                }
              }}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity",
                isCaptain ? "bg-yellow-500 text-white" : "bg-white/20 text-white hover:bg-yellow-500"
              )}
              title="Set captain (Shift+Click to remove from team)"
            >
              <Crown className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Drag overlay player ── */
function DragOverlayPlayer({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-surface shadow-2xl opacity-90">
      {player.photo ? (
        <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
          <span className="text-xs font-bold">{player.firstName?.[0]}{player.lastName?.[0]}</span>
        </div>
      )}
      <p className="text-xs font-medium">{player.firstName} {player.lastName}</p>
    </div>
  );
}

/* ── Pitch component ── */
function Pitch({
  formation,
  starters,
  captainId,
  onRemovePlayer,
  onRemoveFromTeam,
  onSetCaptain,
}: {
  formation: Formation;
  starters: (Player | undefined)[];
  captainId: string | null;
  onRemovePlayer: (slotIndex: number) => void;
  onRemoveFromTeam: (slotIndex: number) => void;
  onSetCaptain: (playerId: string) => void;
}) {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative aspect-[68/105] rounded-2xl overflow-hidden border border-line/40">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a6b3a] via-[#1d7a40] to-[#1a6b3a]" />

        <svg
          viewBox="0 0 680 1050"
          className="absolute inset-0 w-full h-full"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
        >
          <rect x="30" y="30" width="620" height="990" rx="4" />
          <line x1="30" y1="525" x2="650" y2="525" />
          <circle cx="340" cy="525" r="91.5" />
          <circle cx="340" cy="525" r="5" fill="rgba(255,255,255,0.25)" />
          <rect x="170" y="30" width="340" height="165" />
          <rect x="230" y="30" width="220" height="55" />
          <circle cx="340" cy="148" r="5" fill="rgba(255,255,255,0.25)" />
          <path d="M 270 195 A 91.5 91.5 0 0 0 410 195" />
          <rect x="170" y="855" width="340" height="165" />
          <rect x="230" y="965" width="220" height="55" />
          <circle cx="340" cy="902" r="5" fill="rgba(255,255,255,0.25)" />
          <path d="M 270 855 A 91.5 91.5 0 0 1 410 855" />
        </svg>

        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className={cn("absolute left-0 right-0", i % 2 === 0 ? "bg-white/[0.03]" : "")}
            style={{ top: `${i * 10}%`, height: "10%" }}
          />
        ))}
      </div>

      {formation.slots.map((slot, i) => (
        <PitchSlot
          key={`slot-${i}`}
          slot={slot}
          index={i}
          player={starters[i]}
          isCaptain={starters[i]?._id === captainId}
          onRemove={() => onRemovePlayer(i)}
          onRemoveFromTeam={() => onRemoveFromTeam(i)}
          onSetCaptain={() => starters[i] && onSetCaptain(starters[i]!._id)}
        />
      ))}
    </div>
  );
}

const POSITION_OPTIONS = [
  { value: "ALL", label: "All Positions" },
  { value: "GOALKEEPER", label: "Goalkeeper" },
  { value: "DEFENDER", label: "Defender" },
  { value: "MIDFIELDER", label: "Midfielder" },
  { value: "FORWARD", label: "Forward" },
];

/* ── Bench panel (droppable) ── */
function BenchPanel({
  allPlayers,
  teamPlayers,
  captainId,
  onSetCaptain,
  onAddToBench,
}: {
  allPlayers: Player[];
  teamPlayers: Player[];
  captainId: string | null;
  onSetCaptain: (id: string) => void;
  onAddToBench: (player: Player) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "bench" });
  const [playerFilter, setPlayerFilter] = useState<"team" | "all">("team");
  const [positionFilter, setPositionFilter] = useState("ALL");

  const basePlayers = playerFilter === "team" ? teamPlayers : allPlayers;
  const displayPlayers = positionFilter === "ALL"
    ? basePlayers
    : basePlayers.filter((p) => p.position === positionFilter);

  // Count players per position in the current filter
  const positionCounts = basePlayers.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div ref={setNodeRef} className="h-full">
      <Card className={cn("h-full transition-colors", isOver && "border-green-400 bg-green-500/5")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Player Pool
          </CardTitle>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setPlayerFilter("team")}
              className={cn(
                "flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors",
                playerFilter === "team"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-3 w-3 inline mr-1" />
              Team ({teamPlayers.length})
            </button>
            <button
              onClick={() => setPlayerFilter("all")}
              className={cn(
                "flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors",
                playerFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All Club ({allPlayers.length})
            </button>
          </div>
          {/* Position filter */}
          <div className="mt-2">
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full h-8 text-[11px] rounded-md border border-input bg-transparent px-2 py-1 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value !== "ALL" && positionCounts[opt.value] !== undefined ? ` (${positionCounts[opt.value]})` : ""}
                </option>
              ))}
            </select>
          </div>
          {isOver && (
            <p className="text-[10px] text-green-500 font-mono mt-2">Drop here to bench player</p>
          )}
        </CardHeader>
        <CardContent className="p-3 max-h-[600px] overflow-y-auto">
          <div className="space-y-1.5">
            {displayPlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {playerFilter === "team"
                  ? positionFilter === "ALL"
                    ? "No players in this team yet"
                    : `No ${positionFilter.toLowerCase()}s in this team`
                  : positionFilter === "ALL"
                    ? "No players in the club pool"
                    : `No ${positionFilter.toLowerCase()}s in the club pool`
                }
              </p>
            ) : (
              displayPlayers.map((player) => (
                <DraggablePlayer
                  key={player._id}
                  player={player}
                  isCaptain={player._id === captainId}
                  onSetCaptain={() => onSetCaptain(player._id)}
                  onAddToBench={() => onAddToBench(player)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Helper: format match date ── */
function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMatchTime(kickoff?: string): string {
  return kickoff || "TBD";
}

/* ── Bench display below pitch (droppable) ── */
function BenchDisplay({
  benchPlayers,
  startingXI,
  onMoveToPitch,
  onRemove,
}: {
  benchPlayers: Player[];
  startingXI: (Player | undefined)[];
  onMoveToPitch: (idx: number) => void;
  onRemove: (idx: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "bench-display" });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "mt-4 transition-colors",
        isOver && "border-yellow-400 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shirt className="h-4 w-4" />
          Bench / Reserves ({benchPlayers.length})
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {isOver ? "Release to add player to bench" : "Drag a player here or click the shirt icon in the player pool"}
        </p>
      </CardHeader>
      <CardContent className="p-3">
        {benchPlayers.length === 0 ? (
          <div className={cn(
            "text-center py-6 border-2 border-dashed rounded-lg transition-colors",
            isOver ? "border-yellow-400 bg-yellow-500/10" : "border-yellow-500/20"
          )}>
            <Shirt className="h-8 w-8 mx-auto mb-2 text-yellow-500/40" />
            <p className="text-xs text-muted-foreground">No bench players yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Drag players here or click the <Shirt className="h-3 w-3 inline" /> icon
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {benchPlayers.map((player, idx) => (
              <div
                key={`bench-${player._id}-${idx}`}
                className="flex items-center gap-2 p-2 rounded-lg border bg-yellow-500/5 border-yellow-500/20 relative group"
              >
                <button
                  onClick={() => onMoveToPitch(idx)}
                  className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Move to pitch"
                >
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => onRemove(idx)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Remove from bench"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {player.photo ? (
                  <img src={player.photo} alt="" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
                    <span className="text-xs font-bold">{player.firstName?.[0]}{player.lastName?.[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{player.firstName} {player.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {player.position?.replace(/_/g, " ")} {player.number ? `#${player.number}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Match selector component ── */
function MatchSelector({
  matches,
  selectedMatchId,
  onSelect,
  loading,
}: {
  matches: Match[];
  selectedMatchId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading matches...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">No scheduled matches found for this team</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        Select Match
      </label>
      <select
        value={selectedMatchId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        <option value="">Choose a scheduled match...</option>
        {matches.map((m) => {
          const homeTeam = typeof m.homeTeam === "object" ? m.homeTeam : null;
          const awayTeam = typeof m.awayTeam === "object" ? m.awayTeam : null;
          return (
            <option key={m._id} value={m._id}>
              {homeTeam?.name || "Home"} vs {awayTeam?.name || "Away"} — {formatMatchDate(m.matchDate)} [{m.status}]
            </option>
          );
        })}
      </select>
    </div>
  );
}

/* ── Main Formation Editor ── */
function FormationEditor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamPlayerIds, setTeamPlayerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  // Undo state
  const [lastRemovedPlayer, setLastRemovedPlayer] = useState<{
    player: Player;
    slotIndex?: number;
  } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Formation state
  const [formationName, setFormationName] = useState("4-3-3");
  const [formation, setFormation] = useState<Formation>(getFormation("4-3-3"));
  const [startingXI, setStartingXI] = useState<(Player | undefined)[]>(new Array(11).fill(undefined));
  const [benchPlayers, setBenchPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [playerCount, setPlayerCount] = useState<FieldSize>(11);

  // Mode: "matchday" or "formation"
  const [mode, setMode] = useState<"matchday" | "formation">("matchday");

  // Match Day state
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingFormation, setLoadingFormation] = useState(false);

  // Load all teams on mount
  useEffect(() => {
    fetchTeams();
  }, []);

  // Re-fetch formations when page gets focus (to handle tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedMatchId && team && mode === "matchday") {
        loadMatchFormation(selectedMatchId, team._id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [selectedMatchId, team, mode]);

  // When a team is selected, load its data and players
  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId, mode]);

  // When field size changes, update formation and slot count
  const handleFieldSizeChange = (newSize: FieldSize) => {
    setPlayerCount(newSize);
    const options = getFormationOptions(newSize);
    const firstFormation = options[0] || "4-3-3";
    setFormationName(firstFormation);
    setFormation(getFormation(firstFormation, newSize));
    // Adjust startingXI array to match new player count
    setStartingXI((prev) => {
      const newArr = new Array(newSize).fill(undefined);
      for (let i = 0; i < Math.min(prev.length, newSize); i++) {
        newArr[i] = prev[i];
      }
      return newArr;
    });
    // Remove bench players that are now starting
    setBenchPlayers([]);
    setCaptainId(null);
  };

  // When formation name changes, update the formation object
  useEffect(() => {
    setFormation(getFormation(formationName, playerCount));
  }, [formationName, playerCount]);

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

      // Only set formation defaults from team data when NOT in matchday mode
      // In matchday mode, loadMatchFormation is the source of truth
      if (mode !== "matchday") {
        setFormationName(t.formation || "4-3-3");
        setCaptainId(t.captain?._id || t.captain || null);
        setPlayerCount((t as any).playerCount || 11);

        if (t.startingXI && t.startingXI.length > 0) {
          const xi = t.startingXI as any[];
          const loaded = new Array((t as any).playerCount || 11).fill(undefined);
          for (const entry of xi) {
            const player = typeof entry.player === "object" ? entry.player : null;
            if (player && entry.slotIndex >= 0 && entry.slotIndex < loaded.length) {
              loaded[entry.slotIndex] = player;
            }
          }
          setStartingXI(loaded);
        } else {
          setStartingXI(new Array((t as any).playerCount || 11).fill(undefined));
        }

        // Load bench players from team
        if ((t as any).bench && (t as any).bench.length > 0) {
          const bench = (t as any).bench.filter((p: any) => p && p._id).map((p: any) => typeof p === "object" ? p : null).filter(Boolean);
          setBenchPlayers(bench);
        } else {
          setBenchPlayers([]);
        }
      }

      const clubId = typeof t.club === "object" ? t.club?._id || t.club : t.club;

      // Track which players are in the team
      const tPlayerIds = (t.players || []).map((p: any) => {
        if (typeof p === "string") return p;
        if (typeof p === "object" && p._id) return p._id;
        return null;
      }).filter(Boolean) as string[];
      setTeamPlayerIds(new Set(tPlayerIds));

      // Fetch club players, unassigned players and scheduled matches in parallel
      const playersParams: any = { limit: 100 };
      if (clubId) playersParams.club = clubId;
      const [clubRes, unassignedRes, matchesRes] = await Promise.all([
        api.get("/players", { params: playersParams }),
        api.get("/players", { params: { limit: 100 } }),
        mode === "matchday"
          ? api.get("/matches", {
              params: { club: clubId, sort: "matchDate", limit: 50, status: "SCHEDULED" },
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);
      const clubPlayers = clubRes.data?.data || [];
      const unassignedPlayers = (unassignedRes.data?.data || []).filter(
        (p: Player) => !p.club || (typeof p.club === "object" && !p.club._id)
      );

      // Merge and deduplicate
      const allPlayers = [...clubPlayers];
      const clubPlayerIds = new Set(clubPlayers.map((p: Player) => p._id));
      for (const p of unassignedPlayers) {
        if (!clubPlayerIds.has(p._id)) allPlayers.push(p);
      }
      setPlayers(allPlayers);

      // In matchday mode, load the saved formation for the first scheduled match
      console.log("[Formation] loadTeamData mode:", mode, "team:", t?.name);
      if (mode === "matchday") {
        try {
          const scheduledOnly = matchesRes.data?.data || [];
          setScheduledMatches(scheduledOnly);

          // Load formation for the first match
          if (scheduledOnly.length > 0) {
            setSelectedMatchId(scheduledOnly[0]._id);
            await loadMatchFormation(scheduledOnly[0]._id, t._id);
          }
        } catch (e) {
          console.error("Failed to fetch matches in loadTeamData:", e);
        }
      }
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledMatches = async () => {
    if (!team) return;
    setLoadingMatches(true);
    try {
      const clubId = typeof team.club === "object" ? team.club?._id || team.club : team.club;
      // Only fetch SCHEDULED matches (server-side filter)
      const allRes = await api.get("/matches", { params: { club: clubId, sort: "matchDate", limit: 50, status: "SCHEDULED" } });
      const scheduledOnly = allRes.data?.data || [];
      setScheduledMatches(scheduledOnly);

      if (scheduledOnly.length > 0 && !selectedMatchId) {
        setSelectedMatchId(scheduledOnly[0]._id);
      }
    } catch (e) {
      console.error("Failed to fetch scheduled matches:", e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadMatchFormation = useCallback(async (matchId: string, teamId: string) => {
    setLoadingFormation(true);
    try {
      console.log("[Formation] loadMatchFormation called with match:", matchId, "team:", teamId);
      // Use validateStatus to handle 404 gracefully (no formation saved yet)
      const { data, status } = await api.get(`/match-formations/match/${matchId}/team/${teamId}`, {
        validateStatus: (s) => s < 500, // Don't throw for 4xx errors
      });
      const mf = status === 404 ? null : data.data?.formation;
      console.log("[Formation] API returned:", mf ? { formation: mf.formation, xi: mf.startingXI?.length, bench: mf.bench?.length, pc: mf.playerCount } : "NO DATA");
      if (mf) {
        // Load playerCount and formation from match-specific saved data
        const pc = (mf.playerCount || 11) as FieldSize;
        setPlayerCount(pc);
        setFormationName(mf.formation || "4-3-3");
        setCaptainId(mf.captain?._id || null);

        const slotCount = mf.startingXI?.length || pc;
        if (mf.startingXI && mf.startingXI.length > 0) {
          const loaded = new Array(pc).fill(undefined);
          for (const entry of mf.startingXI) {
            const player = typeof entry.player === "object" ? entry.player : null;
            if (player && entry.slotIndex >= 0 && entry.slotIndex < pc) {
              loaded[entry.slotIndex] = player;
            }
          }
          setStartingXI(loaded);
        } else {
          setStartingXI(new Array(pc).fill(undefined));
        }

        // Load bench players
        if (mf.bench && mf.bench.length > 0) {
          const bench = mf.bench.filter((p: any) => p && p._id).map((p: any) => typeof p === "object" ? p : null).filter(Boolean);
          console.log("[Formation] Loaded bench players:", bench.length, bench);
          setBenchPlayers(bench);
        } else {
          console.log("[Formation] No bench players found in formation data");
          setBenchPlayers([]);
        }
      } else {
        // No saved formation for this match — reset pitch only using current playerCount
        console.log("[Formation] No saved formation found, resetting state");
        setStartingXI((prev) => new Array(playerCount).fill(undefined));
        setBenchPlayers([]);
        setCaptainId(null);
      }
      console.log("[Formation] State set successfully");
    } catch (e) {
      console.error("[Formation] FAILED to load match formation:", e);
      // Fallback: reset to empty state if API fails
      setStartingXI((prev) => new Array(playerCount).fill(undefined));
      setBenchPlayers([]);
      setCaptainId(null);
    } finally {
      setLoadingFormation(false);
    }
  }, [playerCount]);

  // Players on the pitch - memoized to prevent recalculation on every render
  const pitchPlayerIds = React.useMemo(() => new Set(startingXI.filter(Boolean).map((p) => p!._id)), [startingXI]);
  const benchPlayerIds = React.useMemo(() => new Set(benchPlayers.map((p) => p._id)), [benchPlayers]);
  const allBenchPlayers = React.useMemo(() => players.filter((p) => !pitchPlayerIds.has(p._id) && !benchPlayerIds.has(p._id)), [players, pitchPlayerIds, benchPlayerIds]);
  const teamBenchPlayers = React.useMemo(() => allBenchPlayers.filter((p) => teamPlayerIds.has(p._id)), [allBenchPlayers, teamPlayerIds]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.player) {
      setActivePlayer(data.player);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);
    if (!over) return;

    const playerData = active.data.current;
    const slotData = over.data.current;
    const player = playerData?.player as Player | undefined;
    if (!player) return;

    const fromSlot: number | undefined = playerData?.fromSlot;
    const toSlot: number | undefined = slotData?.slotIndex;
    const droppedOnBench = over.id === "bench" || over.id === "bench-display";

    // Dropping onto the bench area (from pool or from pitch)
    if (droppedOnBench) {
      // If coming from a pitch slot, clear it
      if (fromSlot !== undefined) {
        setStartingXI((prev) => {
          const next = [...prev];
          next[fromSlot] = undefined;
          return next;
        });
      }
      // Add to bench (skip if already there)
      setBenchPlayers((prev) => {
        if (prev.some((p) => p._id === player._id)) {
          toast.error(`${player.firstName} is already on the bench`);
          return prev;
        }
        return [...prev, player];
      });
      toast.success(`${player.firstName} added to bench`);
      return;
    }

    // Dropping onto a pitch slot
    if (toSlot !== undefined) {
      setStartingXI((prev) => {
        const next = [...prev];
        const existingPlayer = next[toSlot];
        if (fromSlot !== undefined) {
          next[fromSlot] = existingPlayer;
          next[toSlot] = player;
        } else {
          next[toSlot] = player;
        }
        return next;
      });
      // If dragged from bench, remove from bench
      if (fromSlot === undefined) {
        setBenchPlayers((prev) => prev.filter((p) => p._id !== player._id));
      }
      return;
    }

    // Dragged from pitch but not dropped on anything — remove from pitch
    if (fromSlot !== undefined) {
      setStartingXI((prev) => {
        const next = [...prev];
        next[fromSlot] = undefined;
        return next;
      });
    }
  };

  const handleRemovePlayer = (slotIndex: number, removeFromTeam = false) => {
    const removedPlayer = startingXI[slotIndex];
    setStartingXI((prev) => {
      const next = [...prev];
      next[slotIndex] = undefined;
      return next;
    });

    // Also remove from team if requested
    if (removeFromTeam && removedPlayer && team) {
      // Store for undo
      setLastRemovedPlayer({ player: removedPlayer, slotIndex });
      setShowUndoToast(true);
      // Auto-hide undo toast after 5 seconds
      setTimeout(() => setShowUndoToast(false), 5000);

      const newTeamPlayerIds = [...teamPlayerIds].filter((id) => id !== removedPlayer._id);
      setTeamPlayerIds(new Set(newTeamPlayerIds));
      api.patch(`/teams/${team._id}`, { players: newTeamPlayerIds }).catch(() => {});
    }
  };

  const handleUndoRemove = () => {
    if (!lastRemovedPlayer || !team) return;
    const { player } = lastRemovedPlayer;

    // Add player back to team
    const newTeamPlayerIds = [...teamPlayerIds, player._id];
    setTeamPlayerIds(new Set(newTeamPlayerIds));
    api.patch(`/teams/${team._id}`, { players: newTeamPlayerIds }).catch(() => {});

    // Clear undo state
    setLastRemovedPlayer(null);
    setShowUndoToast(false);
  };

  const handleSetCaptain = (playerId: string) => {
    setCaptainId((prev) => (prev === playerId ? null : playerId));
  };

  const handleAddToBench = (player: Player) => {
    if (benchPlayers.some((p) => p._id === player._id)) {
      toast.error(`${player.firstName} is already on the bench`);
      return;
    }
    setBenchPlayers((prev) => [...prev, player]);
    toast.success(`${player.firstName} added to bench`);
  };

  const handleClearAll = () => {
    setStartingXI(new Array(playerCount).fill(undefined));
    setCaptainId(null);
    setBenchPlayers([]);
  };

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      const startingXIEntries = startingXI
        .map((player, index) => {
          if (!player) return null;
          return {
            player: player._id,
            position: formation.slots[index]?.role || "CM",
            slotIndex: index,
          };
        })
        .filter(Boolean);

      // Collect all player IDs on the pitch
      const pitchPlayerIds = startingXI.filter(Boolean).map((p) => p!._id);

      // Get existing team players
      const existingTeamPlayerIds = (team.players || []).map((p) => {
        if (typeof p === "string") return p;
        if (typeof p === "object" && p._id) return p._id;
        return null;
      }).filter(Boolean) as string[];

      // Merge: keep existing players + add new pitch players
      const mergedPlayerIds = [...new Set([...existingTeamPlayerIds, ...pitchPlayerIds])];

      if (mode === "matchday" && selectedMatchId) {
        // Save formation linked to the selected match
        const clubId = typeof team.club === "object" ? team.club?._id || team.club : team.club;
        const payload: Record<string, any> = {
          match: selectedMatchId,
          team: team._id,
          club: clubId,
          formation: formationName,
          playerCount: playerCount,
          startingXI: startingXIEntries,
          bench: benchPlayers.map((p) => p._id),
        };
        console.log("[Formation] Saving match formation with bench:", {
          benchCount: benchPlayers.length,
          benchIds: benchPlayers.map((p) => p._id),
          payload
        });
        // Only include captain if set (avoids Mongoose null cast error)
        if (captainId) payload.captain = captainId;
        await api.post("/match-formations", payload);

        // Also update team's player list if new players were added
        const newPlayersAdded = pitchPlayerIds.filter((id) => !existingTeamPlayerIds.includes(id));
        if (newPlayersAdded.length > 0) {
          await api.patch(`/teams/${team._id}`, {
            players: mergedPlayerIds,
          });
        }

        toast.success("Match formation saved successfully!");
      } else {
        // Save default team formation + update player list + bench
        const teamPayload: Record<string, any> = {
          formation: formationName,
          startingXI: startingXIEntries,
          players: mergedPlayerIds,
          bench: benchPlayers.map((p) => p._id),
        };
        if (captainId) teamPayload.captain = captainId;
        await api.patch(`/teams/${team._id}`, teamPayload);
        toast.success("Formation saved successfully!");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save formation");
    } finally {
      setSaving(false);
    }
  };

  // Selected match info
  const selectedMatch = scheduledMatches.find((m) => m._id === selectedMatchId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No team found. Create a team first.</p>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Formation Editor</h1>
            <p className="text-muted-foreground">
              {team?.name || "Select a team"} — Set your lineup
              {mode === "matchday" && selectedMatch && (
                <span className="ml-2 text-primary font-medium">
                  • {(() => {
                    const homeTeam = typeof selectedMatch.homeTeam === "object" ? selectedMatch.homeTeam : null;
                    const awayTeam = typeof selectedMatch.awayTeam === "object" ? selectedMatch.awayTeam : null;
                    return `${homeTeam?.name || "Home"} vs ${awayTeam?.name || "Away"}`;
                  })()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClearAll} disabled={mode === "matchday" && !selectedMatchId}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button onClick={handleSave} disabled={saving || !team || (mode === "matchday" && !selectedMatchId)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {mode === "matchday" ? "Save Match Formation" : "Save Formation"}
            </Button>
          </div>
        </div>

        {/* Team selector — only in matchday mode */}
        {teams.length > 0 && mode === "matchday" && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium">Team:</span>
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
            <Badge variant="outline">
              {players.length} players in pool
            </Badge>
          </div>
        )}

        {/* Mode tabs + Formation selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMode("matchday")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                mode === "matchday"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              Match Day
            </button>
            <button
              onClick={() => setMode("formation")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                mode === "formation"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shirt className="h-3.5 w-3.5" />
              Formation
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Field Size selector */}
            <select
              value={playerCount}
              onChange={(e) => handleFieldSizeChange(Number(e.target.value) as FieldSize)}
              disabled={mode === "matchday" && !selectedMatchId}
              className="w-44 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {FIELD_SIZES.map((fs) => (
                <option key={fs.value} value={fs.value}>{fs.label}</option>
              ))}
            </select>
            {/* Formation selector (filtered by field size) */}
            <select
              value={formationName}
              onChange={(e) => setFormationName(e.target.value)}
              disabled={mode === "matchday" && !selectedMatchId}
              className="w-32 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {getFormationOptions(playerCount).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <Badge variant="outline">
              {startingXI.filter(Boolean).length}/{playerCount}
            </Badge>
          </div>
        </div>

        {/* Match selector (only in matchday mode) */}
        {mode === "matchday" && (
          <Card>
            <CardContent className="p-4">
              <MatchSelector
                matches={scheduledMatches}
                selectedMatchId={selectedMatchId}
                onSelect={(id) => {
                  setSelectedMatchId(id);
                  if (id && team) loadMatchFormation(id, team._id);
                }}
                loading={loadingMatches}
              />

              {/* Selected match details */}
              {selectedMatch && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-semibold text-sm">
                          {typeof selectedMatch.homeTeam === "object" && selectedMatch.homeTeam ? selectedMatch.homeTeam.name : "Home"}
                        </p>
                        <p className="text-xs text-muted-foreground">Home</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-lg font-bold text-muted-foreground">VS</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMatchDate(selectedMatch.matchDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMatchTime(selectedMatch.kickoff)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">
                          {typeof selectedMatch.awayTeam === "object" && selectedMatch.awayTeam ? selectedMatch.awayTeam.name : "Away"}
                        </p>
                        <p className="text-xs text-muted-foreground">Away</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {selectedMatch.venue?.name || "TBD"}
                    </Badge>
                  </div>
                </div>
              )}

              {loadingFormation && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading match formation...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No match selected warning */}
        {mode === "matchday" && !selectedMatchId && !loadingMatches && (
          <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a scheduled match above to start editing the formation</p>
          </div>
        )}

        {/* Pitch + Bench layout */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", mode === "matchday" && !selectedMatchId && "opacity-40 pointer-events-none")}>
          {/* Pitch */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <Pitch
                  formation={formation}
                  starters={startingXI}
                  captainId={captainId}
                  onRemovePlayer={(idx) => handleRemovePlayer(idx, false)}
                  onRemoveFromTeam={(idx) => handleRemovePlayer(idx, true)}
                  onSetCaptain={handleSetCaptain}
                />
              </CardContent>
            </Card>

            {/* Bench / Reserve players display — droppable zone */}
            <BenchDisplay
              benchPlayers={benchPlayers}
              startingXI={startingXI}
              onMoveToPitch={(idx) => {
                const player = benchPlayers[idx];
                const emptySlot = startingXI.findIndex((s) => !s);
                if (emptySlot >= 0) {
                  setStartingXI((prev) => {
                    const next = [...prev];
                    next[emptySlot] = player;
                    return next;
                  });
                  setBenchPlayers((prev) => prev.filter((_, i) => i !== idx));
                  toast.success(`${player.firstName} moved to pitch slot ${emptySlot + 1}`);
                } else {
                  toast.error("No empty pitch slots — remove a player first");
                }
              }}
              onRemove={(idx) => {
                setBenchPlayers((prev) => prev.filter((_, i) => i !== idx));
              }}
            />
          </div>

          {/* Bench / Player Pool panel */}
          <BenchPanel
            allPlayers={allBenchPlayers}
            teamPlayers={teamBenchPlayers}
            captainId={captainId}
            onSetCaptain={handleSetCaptain}
            onAddToBench={handleAddToBench}
          />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activePlayer ? <DragOverlayPlayer player={activePlayer} /> : null}
      </DragOverlay>

      {/* Undo toast */}
      {showUndoToast && lastRemovedPlayer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <span className="text-sm">
              <strong>{lastRemovedPlayer.player.firstName} {lastRemovedPlayer.player.lastName}</strong> removed from team
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUndoRemove}
              className="gap-1 h-7 text-xs"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </Button>
          </div>
        </div>
      )}
    </DndContext>
  );
}

export default function FormationPage() {
  return <FormationEditor />;
}

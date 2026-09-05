"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Competition } from "@/types";

const columns: Column<Competition>[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type", render: (item) => <Badge variant="outline">{item.type}</Badge> },
  { key: "format", label: "Format", render: (item) => item.format?.replace(/_/g, " ") || "—" },
  { key: "country", label: "Country", render: (item) => item.country || "—" },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Competition Name", type: "text", required: true, placeholder: "Premier League" },
  { key: "type", label: "Type", type: "select", options: [
    { value: "LEAGUE", label: "League" }, { value: "CUP", label: "Cup" },
    { value: "TOURNAMENT", label: "Tournament" }, { value: "FRIENDLY", label: "Friendly" },
  ]},
  { key: "format", label: "Format", type: "select", options: [
    { value: "ROUND_ROBIN", label: "Round Robin" }, { value: "KNOCKOUT", label: "Knockout" },
    { value: "GROUP_STAGE", label: "Group Stage" }, { value: "PLAYOFF", label: "Playoff" },
  ]},
  { key: "country", label: "Country", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "logo", label: "Logo", type: "file", accept: "image/*", uploadType: "logo" },
];

function CompetitionsContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Competition> title="Competitions" endpoint="/competitions" columns={columns} fields={fields} searchPlaceholder="Search competitions..." createTitle="Create Competition" editTitle="Edit Competition"        defaultPayload={clubId ? { club: clubId } : undefined}
        imageField="logo"
    />
  );
}

export default function CompetitionsPage() {
  return <ClubGuard><CompetitionsContent /></ClubGuard>;
}

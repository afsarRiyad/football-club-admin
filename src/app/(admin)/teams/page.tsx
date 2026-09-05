"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Team } from "@/types";

const columns: Column<Team>[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category", render: (item) => <Badge variant="outline">{item.category}</Badge> },
  { key: "division", label: "Division", render: (item) => item.division || "—" },
  { key: "formation", label: "Formation", render: (item) => item.formation || "—" },
  { key: "club", label: "Club", render: (item) => typeof item.club === "object" ? item.club?.name : "—" },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Team Name", type: "text", required: true, placeholder: "First Team" },
  { key: "club", label: "Club", type: "select", required: false, fetchOptions: async () => {
    try {
      const { default: api } = await import("@/lib/api");
      const { data } = await api.get("/clubs", { params: { limit: 50 } });
      const clubs = data.data?.clubs || data.data || [];
      return clubs.map((c: any) => ({ value: c._id, label: c.name }));
    } catch { return []; }
  }},
  { key: "category", label: "Category", type: "select", required: true, options: [
    { value: "SENIOR", label: "Senior" }, { value: "JUNIOR", label: "Junior" },
    { value: "WOMEN", label: "Women" }, { value: "ACADEMY", label: "Academy" }, { value: "RESERVE", label: "Reserve" },
  ]},
  { key: "division", label: "Division", type: "text", placeholder: "Premier League" },
  { key: "formation", label: "Formation", type: "select", options: [
    { value: "4-3-3", label: "4-3-3" }, { value: "4-4-2", label: "4-4-2" },
    { value: "3-5-2", label: "3-5-2" }, { value: "4-2-3-1", label: "4-2-3-1" },
    { value: "3-4-3", label: "3-4-3" }, { value: "5-3-2", label: "5-3-2" },
  ]},
  { key: "logo", label: "Team Logo", type: "file", accept: "image/*", uploadType: "logo" },
];

function TeamsContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Team> title="Teams" endpoint="/teams" columns={columns} fields={fields} searchPlaceholder="Search teams..." createTitle="Create Team" editTitle="Edit Team" imageField="logo" />
  );
}

export default function TeamsPage() {
  return <ClubGuard><TeamsContent /></ClubGuard>;
}

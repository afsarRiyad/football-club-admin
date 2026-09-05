"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Season } from "@/types";

const columns: Column<Season>[] = [
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "isActive", label: "Active", render: (item) => item.isActive ? "✅" : "❌" },
  { key: "startDate", label: "Start", render: (item) => item.startDate ? new Date(item.startDate).toLocaleDateString() : "—" },
  { key: "endDate", label: "End", render: (item) => item.endDate ? new Date(item.endDate).toLocaleDateString() : "—" },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Season Name", type: "text", required: true, placeholder: "2025/26" },
  { key: "year", label: "Year", type: "number", required: true, placeholder: "2025" },
  { key: "startDate", label: "Start Date", type: "date" },
  { key: "endDate", label: "End Date", type: "date" },
  { key: "isActive", label: "Active", type: "select", defaultValue: "true", options: [
    { value: "true", label: "Yes" }, { value: "false", label: "No" },
  ]},
];

function SeasonsContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Season> title="Seasons" endpoint="/seasons" columns={columns} fields={fields} searchPlaceholder="Search seasons..." createTitle="Create Season" editTitle="Edit Season" defaultPayload={clubId ? { club: clubId } : undefined} />
  );
}

export default function SeasonsPage() {
  return <ClubGuard><SeasonsContent /></ClubGuard>;
}

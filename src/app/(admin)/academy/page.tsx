"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Academy } from "@/types";

const columns: Column<Academy>[] = [
  { key: "name", label: "Name" },
  { key: "ageGroup", label: "Age Group", render: (item) => <Badge variant="outline">{item.ageGroup}</Badge> },
  { key: "players", label: "Players", render: (item) => item.players?.length || 0 },
  { key: "isActive", label: "Active", render: (item) => item.isActive ? "✅" : "❌" },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Academy Name", type: "text", required: true, placeholder: "U18 Academy" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "ageGroup", label: "Age Group", type: "select", required: true, options: [
    { value: "SENIOR", label: "Main Team" },
    { value: "U8", label: "U8" }, { value: "U10", label: "U10" }, { value: "U12", label: "U12" },
    { value: "U14", label: "U14" }, { value: "U16", label: "U16" }, { value: "U18", label: "U18" }, { value: "U21", label: "U21" },
  ]},
  { key: "photo", label: "Photo", type: "file", accept: "image/*", uploadType: "photo" },
  { key: "schedule.trainingDays", label: "Training Days", type: "text", placeholder: "Mon, Wed, Fri" },
  { key: "schedule.trainingTime", label: "Training Time", type: "text", placeholder: "10:00 - 12:00" },
];

function AcademyContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Academy> title="Academies" endpoint="/academy" columns={columns} fields={fields} searchPlaceholder="Search academies..." createTitle="Create Academy" editTitle="Edit Academy" defaultPayload={clubId ? { club: clubId } : undefined} imageField="photo" />
  );
}

export default function AcademyPage() {
  return <ClubGuard><AcademyContent /></ClubGuard>;
}

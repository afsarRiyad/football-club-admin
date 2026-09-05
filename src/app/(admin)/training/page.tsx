"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { TrainingSession } from "@/types";

const columns: Column<TrainingSession>[] = [
  { key: "title", label: "Title" },
  { key: "type", label: "Type", render: (item) => <Badge variant="outline">{item.type}</Badge> },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={item.status === "COMPLETED" ? "default" : item.status === "IN_PROGRESS" ? "destructive" : "secondary"}>
        {item.status}
      </Badge>
    ),
  },
  { key: "date", label: "Date", render: (item) => new Date(item.date).toLocaleDateString() },
  { key: "location", label: "Location", render: (item) => item.location || "—" },
];

const fields: FieldConfig[] = [
  { key: "title", label: "Title", type: "text", required: true, placeholder: "Morning Training" },
  { key: "date", label: "Date", type: "datetime-local", required: true },
  { key: "startTime", label: "Start Time", type: "text", placeholder: "10:00" },
  { key: "endTime", label: "End Time", type: "text", placeholder: "12:00" },
  { key: "type", label: "Type", type: "select", options: [
    { value: "TACTICAL", label: "Tactical" }, { value: "PHYSICAL", label: "Physical" },
    { value: "TECHNICAL", label: "Technical" }, { value: "RECOVERY", label: "Recovery" },
    { value: "MIXED", label: "Mixed" },
  ]},
  { key: "status", label: "Status", type: "select", defaultValue: "SCHEDULED", options: [
    { value: "SCHEDULED", label: "Scheduled" }, { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" },
  ]},
  { key: "location", label: "Location", type: "text", placeholder: "Main Pitch" },
  { key: "description", label: "Description", type: "textarea" },
];

function TrainingContent() {
  const { clubId } = useClub();
  return (
    <DataTable<TrainingSession> title="Training Sessions" endpoint="/training" columns={columns} fields={fields} searchPlaceholder="Search sessions..." createTitle="Create Session" editTitle="Edit Session" defaultPayload={clubId ? { club: clubId } : undefined} />
  );
}

export default function TrainingPage() {
  return <ClubGuard><TrainingContent /></ClubGuard>;
}

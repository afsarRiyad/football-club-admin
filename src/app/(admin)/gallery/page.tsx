"use client";

import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Gallery } from "@/types";

const columns: Column<Gallery>[] = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category" },
  { key: "media", label: "Media Count", render: (item) => item.media?.length || 0 },
  { key: "createdAt", label: "Created", render: (item) => new Date(item.createdAt).toLocaleDateString() },
];

const fields: FieldConfig[] = [
  { key: "title", label: "Gallery Title", type: "text", required: true, placeholder: "Match Day Photos" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "category", label: "Category", type: "select", options: [
    { value: "Match", label: "Match" }, { value: "Training", label: "Training" },
    { value: "Event", label: "Event" }, { value: "Team", label: "Team" }, { value: "Other", label: "Other" },
  ]},
  { key: "coverImage", label: "Cover Image", type: "file", accept: "image/*", uploadType: "cover" },
  { key: "isPublished", label: "Published", type: "select", defaultValue: "true", options: [
    { value: "true", label: "Yes" }, { value: "false", label: "No" },
  ]},
];

function GalleryContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Gallery> title="Galleries" endpoint="/gallery" columns={columns} fields={fields} searchPlaceholder="Search galleries..." createTitle="Create Gallery" editTitle="Edit Gallery" defaultPayload={clubId ? { club: clubId } : undefined} imageField="coverImage" />
  );
}

export default function GalleryPage() {
  return <ClubGuard><GalleryContent /></ClubGuard>;
}

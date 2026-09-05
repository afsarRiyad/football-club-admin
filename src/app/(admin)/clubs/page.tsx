"use client";

import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { Club } from "@/types";

const columns: Column<Club>[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "founded", label: "Founded" },
  {
    key: "stadium",
    label: "Stadium",
    render: (item) => item.stadium?.name || "—",
  },
  {
    key: "location",
    label: "Location",
    render: (item) => item.location ? `${item.location.city || ""} ${item.location.country || ""}`.trim() || "—" : "—",
  },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Club Name", type: "text", required: true, placeholder: "FC Barcelona" },
  { key: "description", label: "Description", type: "textarea", placeholder: "About the club..." },
  { key: "founded", label: "Founded Year", type: "number", placeholder: "1899" },
  { key: "logo", label: "Logo", type: "file", accept: "image/*", uploadType: "logo" },
  { key: "cover", label: "Cover Image", type: "file", accept: "image/*", uploadType: "cover" },
  { key: "contact.email", label: "Contact Email", type: "email" },
  { key: "contact.phone", label: "Contact Phone", type: "text" },
  { key: "contact.website", label: "Website", type: "text", placeholder: "https://example.com" },
  { key: "location.country", label: "Country", type: "text" },
  { key: "location.city", label: "City", type: "text" },
  { key: "location.address", label: "Address", type: "text" },
];

export default function ClubsPage() {
  return (
    <DataTable<Club>
      title="Clubs"
      endpoint="/clubs"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search clubs..."
      createTitle="Create Club"
      editTitle="Edit Club"
      imageField="logo"
    />
  );
}

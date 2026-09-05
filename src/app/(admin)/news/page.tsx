"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { News } from "@/types";

const columns: Column<News>[] = [
  { key: "title", label: "Title" },
  { key: "category", label: "Category", render: (item) => item.category ? <Badge variant="outline">{item.category}</Badge> : "—" },
  {
    key: "isPublished",
    label: "Status",
    render: (item) => (
      <Badge variant={item.isPublished ? "default" : "secondary"}>
        {item.isPublished ? "Published" : "Draft"}
      </Badge>
    ),
  },
  { key: "viewCount", label: "Views" },
  { key: "createdAt", label: "Created", render: (item) => new Date(item.createdAt).toLocaleDateString() },
];

const fields: FieldConfig[] = [
  { key: "title", label: "Title", type: "text", required: true, placeholder: "Article title" },
  { key: "excerpt", label: "Excerpt", type: "textarea", placeholder: "Short summary..." },
  { key: "content", label: "Content", type: "textarea", required: true, placeholder: "Full article content..." },
  { key: "cover", label: "Cover Image", type: "file", accept: "image/*", uploadType: "cover" },
  { key: "category", label: "Category", type: "select", options: [
    { value: "Transfer", label: "Transfer" }, { value: "Match Report", label: "Match Report" },
    { value: "Interview", label: "Interview" }, { value: "Analysis", label: "Analysis" },
    { value: "Club News", label: "Club News" }, { value: "General", label: "General" },
  ]},
  { key: "isPublished", label: "Published", type: "select", defaultValue: "false", options: [
    { value: "true", label: "Yes" }, { value: "false", label: "No" },
  ]},
];

function NewsContent() {
  const { clubId } = useClub();
  return (
    <DataTable<News> title="News" endpoint="/news" columns={columns} fields={fields} searchPlaceholder="Search articles..." createTitle="Create Article" editTitle="Edit Article" defaultPayload={clubId ? { club: clubId } : undefined} imageField="cover" />
  );
}

export default function NewsPage() {
  return <ClubGuard><NewsContent /></ClubGuard>;
}

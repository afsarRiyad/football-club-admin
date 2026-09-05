"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import { ClubGuard } from "@/components/admin/club-guard";
import { useClub } from "@/lib/use-club";
import { Member } from "@/types";

const columns: Column<Member>[] = [
  { key: "user", label: "User", render: (item) => typeof item.user === "object" ? item.user?.name : "—" },
  { key: "membershipType", label: "Type", render: (item) => <Badge variant="outline">{item.membershipType}</Badge> },
  { key: "expiryDate", label: "Expires", render: (item) => new Date(item.expiryDate).toLocaleDateString() },
  { key: "isActive", label: "Active", render: (item) => item.isActive ? "✅" : "❌" },
];

const fields: FieldConfig[] = [
  { key: "user", label: "User ID", type: "text", required: true, placeholder: "User ID" },
  { key: "membershipType", label: "Membership Type", type: "select", required: true, options: [
    { value: "FREE", label: "Free" }, { value: "BASIC", label: "Basic" },
    { value: "PREMIUM", label: "Premium" }, { value: "VIP", label: "VIP" },
  ]},
  { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
  { key: "isActive", label: "Active", type: "select", defaultValue: "true", options: [
    { value: "true", label: "Yes" }, { value: "false", label: "No" },
  ]},
];

function MembersContent() {
  const { clubId } = useClub();
  return (
    <DataTable<Member>
      title="Members"
      endpoint="/members"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search members..."
      createTitle="Add Member"
      editTitle="Edit Member"
      defaultPayload={clubId ? { club: clubId } : undefined}
      extraParams={clubId ? { club: clubId } : undefined}
    />
  );
}

export default function MembersPage() {
  return <ClubGuard><MembersContent /></ClubGuard>;
}

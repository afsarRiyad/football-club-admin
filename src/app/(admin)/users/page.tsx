"use client";

import { Badge } from "@/components/ui/badge";
import DataTable, { Column, FieldConfig } from "@/components/admin/data-table";
import api from "@/lib/api";
import { User } from "@/types";

const columns: Column<User>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role", render: (item) => <Badge variant="outline">{item.role.replace(/_/g, " ")}</Badge> },
  { key: "isActive", label: "Active", render: (item) => item.isActive ? "✅" : "❌" },
  { key: "createdAt", label: "Joined", render: (item) => new Date(item.createdAt).toLocaleDateString() },
];

const fields: FieldConfig[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "role", label: "Role", type: "select", required: true, options: [
    { value: "SUPER_ADMIN", label: "Super Admin" }, { value: "CLUB_ADMIN", label: "Club Admin" },
    { value: "TEAM_MANAGER", label: "Team Manager" }, { value: "COACH", label: "Coach" },
    { value: "SCORER", label: "Scorer" }, { value: "PLAYER", label: "Player" }, { value: "MEMBER", label: "Member" },
  ]},
];

export default function UsersPage() {
  return (
    <DataTable<User>
      title="Users"
      endpoint="/users"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search users..."
      createTitle="Create User"
      editTitle="Edit User"
    />
  );
}

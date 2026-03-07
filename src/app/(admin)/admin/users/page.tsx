import { getAllUsers, type AdminUser } from "@/lib/admin-queries";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

const columns: Column<AdminUser>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.displayName} src={row.avatarUrl} size="sm" />
        <span className="font-medium text-midnight">{row.displayName}</span>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    hideOnMobile: true,
    render: (row) => <span className="text-muted">{row.email}</span>,
  },
  {
    key: "crewCount",
    header: "Crews",
    render: (row) => <Badge>{row.crewCount}</Badge>,
  },
  {
    key: "joined",
    header: "Joined",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{timeAgo(row.createdAt)}</span>
    ),
  },
];

export default function AdminUsersPage() {
  const users = getAllUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Users
        </h1>
        <Badge variant="muted">{users.length} total</Badge>
      </div>
      <DataTable columns={columns} data={users} emptyMessage="No users yet." />
    </div>
  );
}

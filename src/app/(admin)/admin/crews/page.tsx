import { getAllCrews, type AdminCrew } from "@/lib/admin-queries";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatPoints, timeAgo } from "@/lib/utils";

const columns: Column<AdminCrew>[] = [
  {
    key: "name",
    header: "Crew",
    render: (row) => (
      <span className="font-medium text-midnight">{row.name}</span>
    ),
  },
  {
    key: "cardHolder",
    header: "Card Holder",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted">{row.cardHolderName}</span>
    ),
  },
  {
    key: "members",
    header: "Members",
    render: (row) => <Badge>{row.memberCount}</Badge>,
  },
  {
    key: "points",
    header: "Points",
    render: (row) => (
      <span className="font-mono text-midnight">
        {formatPoints(row.pointBalance)}
      </span>
    ),
  },
  {
    key: "tasks",
    header: "Tasks",
    hideOnMobile: true,
    render: (row) => <span className="text-muted">{row.taskCount}</span>,
  },
  {
    key: "inviteCode",
    header: "Invite Code",
    hideOnMobile: true,
    render: (row) => (
      <span className="font-mono text-xs text-muted">
        {row.inviteCode.slice(0, 3)}***
      </span>
    ),
  },
  {
    key: "created",
    header: "Created",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{timeAgo(row.createdAt)}</span>
    ),
  },
];

export default function AdminCrewsPage() {
  const crews = getAllCrews();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Crews
        </h1>
        <Badge variant="muted">{crews.length} total</Badge>
      </div>
      <DataTable columns={columns} data={crews} emptyMessage="No crews yet." />
    </div>
  );
}

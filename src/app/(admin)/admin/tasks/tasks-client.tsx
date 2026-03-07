"use client";

import { useState, useMemo } from "react";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { timeAgo, cn } from "@/lib/utils";
import type { AdminTask, CrewOption } from "@/lib/admin-queries";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  claimed: "default",
  in_progress: "default",
  completed: "success",
  cancelled: "muted",
};

const STATUSES = ["all", "pending", "claimed", "in_progress", "completed", "cancelled"] as const;

const columns: Column<AdminTask>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => (
      <span className="font-medium text-midnight">{row.title}</span>
    ),
  },
  {
    key: "crew",
    header: "Crew",
    hideOnMobile: true,
    render: (row) => <span className="text-muted">{row.crewName}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={STATUS_VARIANTS[row.status] ?? "muted"}>
        {row.status.replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    key: "mode",
    header: "Mode",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted capitalize">{row.requestMode}</span>
    ),
  },
  {
    key: "points",
    header: "Points",
    render: (row) => (
      <span className="font-mono text-midnight">{row.pointCost}</span>
    ),
  },
  {
    key: "urgency",
    header: "Urgency",
    hideOnMobile: true,
    render: (row) => (
      <span className="capitalize text-muted">{row.urgency}</span>
    ),
  },
  {
    key: "createdBy",
    header: "Created By",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted">{row.createdByName}</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    hideOnMobile: true,
    render: (row) => (
      <span className="text-muted text-xs">{timeAgo(row.createdAt)}</span>
    ),
  },
];

type TasksClientProps = {
  tasks: AdminTask[];
  crewOptions: CrewOption[];
};

export function TasksClient({ tasks, crewOptions }: TasksClientProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (crewFilter !== "all" && task.crewId !== crewFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, crewFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Tasks
        </h1>
        <Badge variant="muted">{filtered.length} shown</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition-colors",
                "min-h-[44px]",
                statusFilter === status
                  ? "bg-royal-50 text-royal"
                  : "bg-surface text-muted hover:text-ink"
              )}
            >
              {status === "all" ? "All" : status.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <select
          value={crewFilter}
          onChange={(e) => setCrewFilter(e.target.value)}
          className="rounded-button border border-royal-100 bg-surface px-3 py-1.5 text-sm text-ink min-h-[44px]"
        >
          <option value="all">All crews</option>
          {crewOptions.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No tasks match the current filters." />
    </div>
  );
}

import { getAllTasks, getCrewsForFilter } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/require-admin";
import { TasksClient } from "./tasks-client";

export default async function AdminTasksPage() {
  await requireAdmin();

  const tasks = await getAllTasks();
  const crewOptions = await getCrewsForFilter();

  return <TasksClient tasks={tasks} crewOptions={crewOptions} />;
}

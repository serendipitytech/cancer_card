import { getAllTasks, getCrewsForFilter } from "@/lib/admin-queries";
import { TasksClient } from "./tasks-client";

export default function AdminTasksPage() {
  const tasks = getAllTasks();
  const crewOptions = getCrewsForFilter();

  return <TasksClient tasks={tasks} crewOptions={crewOptions} />;
}

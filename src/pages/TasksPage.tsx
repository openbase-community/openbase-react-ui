import { ProjectLayout } from "@/components/ProjectLayout";
import { TasksView } from "@/components/TasksView";
import { useParams } from "react-router-dom";

const TasksPage = () => {
  const { appName } = useParams<{ appName: string }>();

  return (
    <ProjectLayout selectedSection="tasks" pageTitle="Tasks" appName={appName}>
      {appName && <TasksView appName={appName} />}
    </ProjectLayout>
  );
};

export default TasksPage;

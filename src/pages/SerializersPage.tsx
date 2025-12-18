import { ProjectLayout } from "@/components/ProjectLayout";
import { SerializersView } from "@/components/SerializersView";
import { useParams } from "react-router-dom";

const SerializersPage = () => {
  const { appName } = useParams<{ appName: string }>();

  return (
    <ProjectLayout
      selectedSection="serializers"
      pageTitle="Serializers"
      appName={appName}
    >
      {appName && <SerializersView appName={appName} />}
    </ProjectLayout>
  );
};

export default SerializersPage;

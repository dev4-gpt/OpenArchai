import { DemoSandbox } from "@/components/demo/demo-sandbox";
import { getDemoProjectData } from "@/lib/demo-data";

export const metadata = {
  title: "Public Sandbox Demo | AtelierOS",
  description: "Interactive architectural sandbox demo: 2D floor plan studio, 3D model viewer, AI renders, and building code compliance.",
};

export default async function DemoPage() {
  const demoData = await getDemoProjectData();
  return <DemoSandbox demoData={demoData} />;
}

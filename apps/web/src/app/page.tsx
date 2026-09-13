import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DemoSandbox } from "@/components/demo/demo-sandbox";
import { getDemoProjectData } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AtelierOS | Intelligent Architecture OS",
  description: "Transform 2D floor plans into 3D models, photorealistic architectural renders, and automated building code compliance.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already signed in, go straight to your personal workspace
  if (user) {
    redirect("/dashboard");
  }

  // If guest or unauthenticated visitor, drop directly into the interactive public sandbox demo
  const demoData = await getDemoProjectData();
  return <DemoSandbox demoData={demoData} />;
}

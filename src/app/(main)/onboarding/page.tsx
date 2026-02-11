import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserCrews } from "@/lib/session";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existingCrews = getUserCrews(session.user.id);
  const isAdditional = existingCrews.length > 0;

  return <OnboardingClient isAdditional={isAdditional} />;
}

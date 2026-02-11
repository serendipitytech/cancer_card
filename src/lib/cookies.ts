import { cookies } from "next/headers";
import { ACTIVE_CREW_COOKIE_NAME } from "@/lib/cookie-constants";

export { ACTIVE_CREW_COOKIE_NAME };

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getActiveCrewCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_CREW_COOKIE_NAME)?.value ?? null;
}

export async function setActiveCrewCookie(crewId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CREW_COOKIE_NAME, crewId, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

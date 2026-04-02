import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LoginClient from "./login-client";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard/feed");

  return <LoginClient />;
}

import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";

export default async function SignInPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  const result = await db.select({ value: count() }).from(users);
  const canBootstrap = (result[0]?.value ?? 0) === 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
      <SignInForm canBootstrap={canBootstrap} />
    </main>
  );
}

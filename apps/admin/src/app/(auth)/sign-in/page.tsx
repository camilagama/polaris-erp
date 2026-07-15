import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminSignInForm } from "./sign-in-form";

export default async function AdminSignInPage() {
  if (await getSession()) {
    redirect("/");
  }

  return (
    <main className="min-h-screen w-full">
      <AdminSignInForm />
    </main>
  );
}

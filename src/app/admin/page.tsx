import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { TopNav } from "@/app/components/TopNav";
import { getUserSessionMetadata } from "@/server/users";





export default async function AdminPage() {
  const sessionUser = await getUserSessionMetadata();
  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    redirect("/");
  }


  return (
    <div className="min-h-screen bg-background">
     <h1>Hello Super Admin</h1>
     <h3>Welcome to the Super Admin Dashboard {sessionUser.firstName} {sessionUser.lastName}</h3>
        <p>This is where you can manage tenants and oversee the entire platform.</p>
    </div>
  );
}
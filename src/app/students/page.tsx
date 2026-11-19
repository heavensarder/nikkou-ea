import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import StudentListClient from "@/components/StudentListClient";

export default async function StudentListPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading students...</div>}>
      <StudentListClient />
    </Suspense>
  );
}

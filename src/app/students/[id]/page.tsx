import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import StudentDetailClient from "@/components/StudentDetailClient";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  return <StudentDetailClient studentId={id} />;
}

import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import EditStudentClient from "@/components/EditStudentClient";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  return <EditStudentClient studentId={id} />;
}

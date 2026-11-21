import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import StudentForm from "@/components/StudentForm";

export default async function CreateStudentPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  return (
    <AppShell
      title="Create a New Student"
      subtitle="Add a new student placement record, payment ledger, and verification attachments"
      backUrl="/students"
      backLabel="Student List"
    >
      <StudentForm isEditMode={false} />
    </AppShell>
  );
}

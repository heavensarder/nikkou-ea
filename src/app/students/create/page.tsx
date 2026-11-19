import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import StudentForm from "@/components/StudentForm";
import { ArrowLeft } from "lucide-react";

export default async function CreateStudentPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  return (
    <AppShell
      title="Create a New Student"
      subtitle="Add a new student placement record, payment ledger, and verification attachments"
    >
      <StudentForm isEditMode={false} />
    </AppShell>
  );
}

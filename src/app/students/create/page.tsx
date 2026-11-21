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
      backUrl="/students"
      backLabel="Student List"
    >
      <div className="space-y-4">
        {/* Breadcrumb Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-secondary transition group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-secondary group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Student List</span>
          </Link>
        </div>

        <StudentForm isEditMode={false} />
      </div>
    </AppShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StudentForm from "@/components/StudentForm";
import { StudentRecord } from "@/lib/constants";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";

export default function EditStudentClient({
  studentId,
}: {
  studentId: string;
}) {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setStudent(data.student);
        }
      } catch (err) {
        console.error("Failed to load student for edit:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  return (
    <AppShell
      title={
        student
          ? `Edit Student: ${student.applicant_name}`
          : "Edit Student Record"
      }
      subtitle="Update student information, job category, payment installments, draft status, and attachments"
      backUrl={student ? `/students/${student.id}` : "/students"}
      backLabel={student ? "Student Details" : "Student List"}
    >
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-secondary">
          <Loader2 className="w-9 h-9 animate-spin mb-3" />
          <p className="text-sm font-semibold">Loading student for editing...</p>
        </div>
      ) : !student ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-bold text-slate-800">
            Student Record Not Found
          </h3>
          <Link
            href="/students"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold"
          >
            Return to Student List
          </Link>
        </div>
      ) : (
        <StudentForm initialData={student} isEditMode={true} />
      )}
    </AppShell>
  );
}

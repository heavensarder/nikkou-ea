"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "./AppShell";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import ConfirmModal from "./ConfirmModal";
import {
  ATTACHMENT_TYPES,
  formatAttachmentFileName,
  STUDENT_STATUSES,
  StudentAttachment,
  StudentRecord,
} from "@/lib/constants";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Eye,
  Download,
  FileText,
  Building2,
  Phone,
  Mail,
  Globe,
  Wallet,
  Calendar,
  CheckCircle2,
  FileEdit,
  Loader2,
  Briefcase,
  User,
} from "lucide-react";

interface StudentDetailClientProps {
  studentId: string;
}

export default function StudentDetailClient({
  studentId,
}: StudentDetailClientProps) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    number | null
  >(null);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [confirmState, setConfirmState] = useState<
    | { type: "student" }
    | { type: "attachment"; attachment: StudentAttachment }
    | null
  >(null);
  const [previewItem, setPreviewItem] = useState<{
    fileUrl: string;
    fileName: string;
    title?: string | null;
    mimeType?: string;
  } | null>(null);

  const loadStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
      }
    } catch (error) {
      console.error("Failed to load student details:", error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  async function handleStatusChange(newStatus: string) {
    if (!student) return;
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStudent({ ...student, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleToggleDraft() {
    if (!student) return;
    const nextDraft = !Boolean(student.is_draft);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_draft: nextDraft }),
      });
      if (res.ok) {
        setStudent({ ...student, is_draft: nextDraft ? 1 : 0 });
      }
    } catch (err) {
      console.error("Failed to toggle draft status:", err);
    }
  }

  function handleDeleteAttachment(att: StudentAttachment) {
    setConfirmState({ type: "attachment", attachment: att });
  }

  function handleDeleteStudent() {
    if (!student) return;
    setConfirmState({ type: "student" });
  }

  async function executeConfirmDelete() {
    if (!confirmState || !student) return;

    if (confirmState.type === "attachment") {
      const att = confirmState.attachment;
      setDeletingAttachmentId(att.id);
      try {
        const res = await fetch(`/api/attachments/${att.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setStudent({
            ...student,
            attachments: (student.attachments || []).filter(
              (a) => a.id !== att.id
            ),
          });
          setConfirmState(null);
        }
      } catch (err) {
        console.error("Failed to delete attachment:", err);
      } finally {
        setDeletingAttachmentId(null);
      }
    } else if (confirmState.type === "student") {
      setDeletingStudent(true);
      try {
        const res = await fetch(`/api/students/${student.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setConfirmState(null);
          router.push("/students");
          router.refresh();
        }
      } catch (err) {
        console.error("Delete student error:", err);
      } finally {
        setDeletingStudent(false);
      }
    }
  }

  function getStatusColor(status: string) {
    const found = STUDENT_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <AppShell
      title={
        student
          ? `Student Record: ${student.applicant_name}`
          : "Student Record Details"
      }
      subtitle="Complete placement dossier, payment installments, and verification attachments"
      backUrl="/students"
      backLabel="Student List"
    >
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-secondary">
          <Loader2 className="w-9 h-9 animate-spin mb-3" />
          <p className="text-sm font-semibold">Loading student dossier...</p>
        </div>
      ) : !student ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-bold text-slate-800">
            Student Record Not Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            The requested student record does not exist or has been removed.
          </p>
          <Link
            href="/students"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student List</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6 pb-16">
          {/* Breadcrumb Back Link */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/students"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-secondary transition group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-secondary group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Student List</span>
            </Link>

            <span className="text-xs font-medium text-slate-400">
              Student #{student.id}
            </span>
          </div>

          {/* Profile Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Applicant Photo */}
                <div className="relative group">
                  <div className="w-28 h-32 rounded-2xl bg-secondary/10 border-2 border-slate-200 overflow-hidden shadow-sm flex items-center justify-center text-3xl font-extrabold text-secondary shrink-0">
                    {student.photo_path ? (
                      <img
                        src={student.photo_path}
                        alt={student.applicant_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (student.applicant_name || "S").charAt(0).toUpperCase()
                    )}
                  </div>
                  {student.photo_path && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewItem({
                            fileUrl: student.photo_path!,
                            fileName: formatAttachmentFileName(
                              student.applicant_name,
                              "Applicant Photo",
                              student.photo_path!
                            ),
                            title: `${student.applicant_name} — Applicant Photo`,
                            mimeType: "image/jpeg",
                          })
                        }
                        className="px-2 py-1 rounded-md bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <a
                        href={`${student.photo_path}?download=1&name=${encodeURIComponent(
                          formatAttachmentFileName(
                            student.applicant_name,
                            "Applicant Photo",
                            student.photo_path
                          )
                        )}`}
                        download={formatAttachmentFileName(
                          student.applicant_name,
                          "Applicant Photo",
                          student.photo_path
                        )}
                        className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </a>
                    </div>
                  )}
                </div>

                {/* Applicant Core Details */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary text-white">
                      {student.job_category}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      {student.job_trade}
                      {student.job_sub_category
                        ? ` • ${student.job_sub_category}`
                        : ""}
                    </span>
                    {Boolean(student.is_draft) ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <FileEdit className="w-3.5 h-3.5" />
                        Draft Mode
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Published
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {student.applicant_name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-secondary" />
                      Gender: <strong>{student.gender}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-secondary" />
                      Company:{" "}
                      <strong>{student.company_name || "Not specified"}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-secondary" />
                      Supervising Org:{" "}
                      <strong>
                        {student.supervising_organization || "Not specified"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Draft Controls */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Student Status
                  </label>
                  <select
                    value={student.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${getStatusColor(
                      student.status
                    )}`}
                  >
                    {STUDENT_STATUSES.map((st) => (
                      <option
                        key={st.value}
                        value={st.value}
                        className="bg-white text-slate-800"
                      >
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleToggleDraft}
                  className="text-xs font-semibold text-secondary hover:text-primary underline"
                >
                  {Boolean(student.is_draft)
                    ? "Mark as Published Record"
                    : "Convert to Draft"}
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/students/${student.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2xs transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Mode</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeleteStudent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-primary hover:text-white text-primary text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Grid: Placement Details + Contact Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Placement & Organizations Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-secondary/5 border-b border-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-bold text-secondary">
                  Placement &amp; Organization Information
                </h3>
              </div>
              <div className="p-6 divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Job Category</span>
                  <span className="font-bold text-secondary">
                    {student.job_category}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Occupational Sector</span>
                  <span className="font-bold text-slate-900">
                    {student.job_trade}
                  </span>
                </div>
                {student.job_sub_category && (
                  <div className="py-2.5 flex justify-between gap-4">
                    <span className="text-slate-500">Sub-Category</span>
                    <span className="font-bold text-primary">
                      {student.job_sub_category}
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">
                    Company Name (Implementing Org)
                  </span>
                  <span className="font-semibold text-slate-900 text-right">
                    {student.company_name || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Company Address</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {student.company_address || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">
                    Supervising Organization
                  </span>
                  <span className="font-semibold text-slate-900 text-right">
                    {student.supervising_organization || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Social Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 bg-secondary/5 border-b border-slate-200 flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-bold text-secondary">
                  Contact &amp; Social Information
                </h3>
              </div>
              <div className="p-6 divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    BD Phone Number
                  </span>
                  <span className="font-semibold text-slate-900">
                    {student.bd_phone || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    JP Phone Number
                  </span>
                  <span className="font-semibold text-slate-900">
                    {student.jp_phone || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email
                  </span>
                  <span className="font-semibold text-slate-900">
                    {student.email || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    WhatsApp
                  </span>
                  <span className="font-semibold text-slate-900">
                    {student.whatsapp || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Facebook
                  </span>
                  <span className="font-semibold text-secondary truncate max-w-[240px]">
                    {student.facebook || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Financials & Payment Installments Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-secondary/5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-secondary shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-secondary">
                  Payment Ledger &amp; Installment History
                </h3>
              </div>
              <Link
                href={`/students/${student.id}/edit`}
                className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
              >
                + Add / Edit Payments
              </Link>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Amount to be Received
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    ৳{" "}
                    {Math.round(
                      Number(student.total_amount || 0)
                    ).toLocaleString("en-US")}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Total Payment Received
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
                    ৳{" "}
                    {Math.round(
                      Number(student.payment_received || 0)
                    ).toLocaleString("en-US")}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Payment Due (Auto-calculated)
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-primary mt-1">
                    ৳{" "}
                    {Math.round(
                      Number(student.payment_due || 0)
                    ).toLocaleString("en-US")}
                  </div>
                </div>
              </div>

              {student.payments && student.payments.length > 0 ? (
                <>
                  {/* Mobile Card List (< 640px) */}
                  <div className="space-y-2.5 sm:hidden">
                    {student.payments.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-xs font-extrabold shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {p.note || `Installment #${idx + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" />
                            <span>{p.payment_date}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Amount
                          </div>
                          <div className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                            ৳{" "}
                            {Math.round(Number(p.amount || 0)).toLocaleString(
                              "en-US"
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet & Desktop Table (>= 640px) */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                          <th className="py-3 px-4">Installment #</th>
                          <th className="py-3 px-4">Payment Date</th>
                          <th className="py-3 px-4">Note / Reference</th>
                          <th className="py-3 px-4 text-right">
                            Amount Received
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {student.payments.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="py-3 px-4 font-bold text-slate-600 whitespace-nowrap">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" />
                                <span>{p.payment_date}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {p.note || "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                              ৳{" "}
                              {Math.round(Number(p.amount || 0)).toLocaleString(
                                "en-US"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No payment installments recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Attachments Dossier (All 11 Categories with View, Download, Delete) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-secondary/5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-secondary shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-secondary">
                    Student Attachments &amp; Verification Documents
                  </h3>
                  <p className="text-xs text-slate-500">
                    View, download, or delete any uploaded student document. Uploaded fields are highlighted in green.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {
                    ATTACHMENT_TYPES.filter((cfg) =>
                      (student.attachments || []).some(
                        (a) => a.attachment_type === cfg.key
                      )
                    ).length
                  }{" "}
                  / {ATTACHMENT_TYPES.length} Categories Uploaded
                </span>
                <Link
                  href={`/students/${student.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary-hover transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Upload / Manage Attachments</span>
                </Link>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* 1. Standard Single-Document Categories (9 items -> 3x3 symmetrical grid on desktop, 2-col on tablet) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ATTACHMENT_TYPES.filter((c) => !c.multiple).map((config) => {
                  const files = (student.attachments || []).filter(
                    (a) => a.attachment_type === config.key
                  );
                  const hasUploaded = files.length > 0;

                  return (
                    <div
                      key={config.key}
                      className={`rounded-2xl p-4 flex flex-col justify-between transition-all ${
                        hasUploaded
                          ? "bg-emerald-50/85 border-2 border-emerald-400 shadow-sm ring-1 ring-emerald-500/10"
                          : "border border-slate-200 bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              hasUploaded
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-secondary/10 text-secondary"
                            }`}
                          >
                            {hasUploaded ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <h4
                            className={`text-sm font-bold truncate ${
                              hasUploaded
                                ? "text-emerald-950"
                                : "text-slate-800"
                            }`}
                            title={config.label}
                          >
                            {config.label}
                          </h4>
                        </div>
                        <span
                          className={`whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${
                            hasUploaded
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {hasUploaded ? "Uploaded" : "Not Uploaded"}
                        </span>
                      </div>

                      {!hasUploaded ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No file uploaded for {config.label}.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {files.map((att) => {
                            const formattedFileName = formatAttachmentFileName(
                              student.applicant_name,
                              att.title || config.label,
                              att.file_path || att.file_name
                            );
                            const downloadHref = `${att.file_path}${
                              att.file_path.includes("?") ? "&" : "?"
                            }download=1&name=${encodeURIComponent(
                              formattedFileName
                            )}`;

                            return (
                              <div
                                key={att.id}
                                className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div
                                    className="text-xs font-bold text-slate-800 truncate flex-1"
                                    title={formattedFileName}
                                  >
                                    {formattedFileName}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewItem({
                                        fileUrl: att.file_path,
                                        fileName: formattedFileName,
                                        title: att.title || config.label,
                                        mimeType: att.mime_type,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-xs font-semibold transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>

                                  <a
                                    href={downloadHref}
                                    download={formattedFileName}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>

                                  <button
                                    type="button"
                                    disabled={deletingAttachmentId === att.id}
                                    onClick={() => handleDeleteAttachment(att)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition disabled:opacity-40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Multi-Document Categories (Medical Reports & Educational Certificates -> 2-col side-by-side grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ATTACHMENT_TYPES.filter((c) => c.multiple).map((config) => {
                  const files = (student.attachments || []).filter(
                    (a) => a.attachment_type === config.key
                  );
                  const hasUploaded = files.length > 0;

                  return (
                    <div
                      key={config.key}
                      className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                        hasUploaded
                          ? "bg-emerald-50/85 border-2 border-emerald-400 shadow-sm ring-1 ring-emerald-500/10"
                          : "border border-slate-200 bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              hasUploaded
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-secondary/10 text-secondary"
                            }`}
                          >
                            {hasUploaded ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <h4
                            className={`text-sm font-bold ${
                              hasUploaded
                                ? "text-emerald-950"
                                : "text-slate-800"
                            }`}
                          >
                            {config.label}
                          </h4>
                        </div>
                        <span
                          className={`whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            hasUploaded
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {hasUploaded
                            ? `${files.length} Attached`
                            : "Not Uploaded"}
                        </span>
                      </div>

                      {!hasUploaded ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No files uploaded for {config.label}.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {files.map((att) => {
                            const formattedFileName = formatAttachmentFileName(
                              student.applicant_name,
                              att.title || config.label,
                              att.file_path || att.file_name
                            );
                            const downloadHref = `${att.file_path}${
                              att.file_path.includes("?") ? "&" : "?"
                            }download=1&name=${encodeURIComponent(
                              formattedFileName
                            )}`;

                            return (
                              <div
                                key={att.id}
                                className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                <div className="min-w-0">
                                  {att.title && (
                                    <div className="text-xs font-bold text-emerald-800">
                                      {att.title}
                                    </div>
                                  )}
                                  <div
                                    className="text-xs font-semibold text-slate-700 truncate"
                                    title={formattedFileName}
                                  >
                                    {formattedFileName}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewItem({
                                        fileUrl: att.file_path,
                                        fileName: formattedFileName,
                                        title: att.title || config.label,
                                        mimeType: att.mime_type,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-xs font-semibold transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>

                                  <a
                                    href={downloadHref}
                                    download={formattedFileName}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                  </a>

                                  <button
                                    type="button"
                                    disabled={deletingAttachmentId === att.id}
                                    onClick={() => handleDeleteAttachment(att)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition disabled:opacity-40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <AttachmentPreviewModal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        fileUrl={previewItem?.fileUrl || ""}
        fileName={previewItem?.fileName || ""}
        title={previewItem?.title}
        mimeType={previewItem?.mimeType}
      />

      <ConfirmModal
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={executeConfirmDelete}
        title={
          confirmState?.type === "student"
            ? "Delete Student Record?"
            : "Delete Attachment?"
        }
        message={
          confirmState?.type === "student"
            ? "Are you sure you want to permanently delete this student record along with all payment records and uploaded files from the server? This action cannot be undone."
            : "Are you sure you want to permanently remove this document from the student record and server storage?"
        }
        itemName={
          confirmState?.type === "student"
            ? student?.applicant_name
            : confirmState?.type === "attachment"
            ? confirmState.attachment.title || confirmState.attachment.file_name
            : undefined
        }
        confirmText={
          confirmState?.type === "student"
            ? "Delete Student"
            : "Delete Document"
        }
        loading={deletingStudent || deletingAttachmentId !== null}
      />
    </AppShell>
  );
}

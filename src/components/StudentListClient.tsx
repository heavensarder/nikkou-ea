"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "./AppShell";
import ConfirmModal from "./ConfirmModal";
import { StudentRecord, STUDENT_STATUSES } from "@/lib/constants";
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
  FileText,
  Building2,
  Phone,
  Loader2,
  Users,
  Filter,
  RotateCcw,
} from "lucide-react";

export default function StudentListClient() {
  const searchParams = useSearchParams();
  const initialDraftFilter = searchParams.get("draft") || "all";

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobCategory, setJobCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [draftFilter, setDraftFilter] = useState(initialDraftFilter);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (jobCategory) params.set("job_category", jobCategory);
      if (statusFilter) params.set("status", statusFilter);
      if (draftFilter) params.set("draft", draftFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  }, [search, jobCategory, statusFilter, draftFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  async function handleQuickStatusChange(studentId: number, newStatus: string) {
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId ? { ...s, status: newStatus } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  function handleDeleteStudent(studentId: number, name: string) {
    setDeleteTarget({ id: studentId, name });
  }

  async function confirmDeleteStudent() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error("Failed to delete student:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusColor(status: string) {
    const found = STUDENT_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <AppShell
      title="Student List"
      subtitle="Manage Nikkou Centre students placed in Japan, drafts, payment balances, and attachments"
      backUrl="/dashboard"
      backLabel="Dashboard"
    >
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-3">
          {/* Tabs: All / Published / Drafts */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto max-w-full">
              {[
                { key: "all", label: "All Records" },
                { key: "published", label: "Published" },
                { key: "draft", label: "Drafts" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDraftFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    draftFilter === tab.key
                      ? "bg-secondary text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Showing{" "}
              <strong className="text-secondary">{students.length}</strong>{" "}
              record(s)
            </div>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            <div className="sm:col-span-2 lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, company, supervising org, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>

            <div className="lg:col-span-3 relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="w-full pl-8 pr-6 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:border-secondary"
              >
                <option value="">All Job Categories</option>
                <optgroup label="Job Category: TITP / ESD">
                  <option value="TITP/ESD">All TITP / ESD</option>
                  <option value="TITP/ESD::Agriculture">
                    TITP/ESD — Agriculture
                  </option>
                  <option value="TITP/ESD::Construction">
                    TITP/ESD — Construction
                  </option>
                  <option value="TITP/ESD::Restaurant / Food Processing">
                    TITP/ESD — Restaurant / Food Processing
                  </option>
                </optgroup>
                <optgroup label="Job Category: SSW">
                  <option value="SSW">All SSW</option>
                  <option value="SSW::Nursing / Caregiver">
                    SSW — Nursing / Caregiver
                  </option>
                  <option value="SSW::Agriculture">
                    SSW — Agriculture (All)
                  </option>
                  <option value="SSW::Agriculture::General Crop Farming">
                    SSW — Agriculture (General Crop Farming)
                  </option>
                  <option value="SSW::Agriculture::General Livestock Farming">
                    SSW — Agriculture (General Livestock Farming)
                  </option>
                  <option value="SSW::Construction">SSW — Construction</option>
                  <option value="SSW::Building Cleaning">
                    SSW — Building Cleaning
                  </option>
                  <option value="SSW::Driver">SSW — Driver</option>
                </optgroup>
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:border-secondary"
              >
                <option value="">All Placement Statuses</option>
                {STUDENT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setJobCategory("");
                  setStatusFilter("");
                  setDraftFilter("all");
                }}
                className="w-full h-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="lg:hidden">Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Empty / Responsive Data Views */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-xs sm:text-sm font-semibold">
              Loading student records...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              No Matching Student Records Found
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Try clearing your search filters or create a new student placement
              record.
            </p>
            <Link
              href="/students/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create a New Student</span>
            </Link>
          </div>
        ) : (
          <>
            {/* 1. MOBILE & SMALL TABLET CARD VIEW (< 768px) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
                >
                  {/* Top Row: Avatar, Name, Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-secondary">
                        {student.photo_path ? (
                          <img
                            src={student.photo_path}
                            alt={student.applicant_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (student.applicant_name || "S")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-primary truncate"
                          >
                            {student.applicant_name}
                          </Link>
                          {Boolean(student.is_draft) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              DRAFT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          ID #{student.id} • {student.gender}
                        </p>
                      </div>
                    </div>

                    <select
                      value={student.status}
                      onChange={(e) =>
                        handleQuickStatusChange(student.id, e.target.value)
                      }
                      className={`px-2 py-1 rounded-full text-[11px] font-bold border cursor-pointer shrink-0 ${getStatusColor(
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

                  {/* Category & Organizations */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          student.job_category === "SSW"
                            ? "bg-secondary text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {student.job_category}
                      </span>
                      <div className="font-bold text-slate-800 mt-1 truncate">
                        {student.job_trade}
                      </div>
                      {student.job_sub_category && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {student.job_sub_category}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 text-secondary shrink-0" />
                        <span className="truncate">
                          {student.company_name || "No Company"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Sup: {student.supervising_organization || "—"}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{student.bd_phone || student.jp_phone || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financials Row */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Total
                      </div>
                      <div className="font-bold text-slate-800">
                        ৳
                        {Math.round(
                          Number(student.total_amount || 0)
                        ).toLocaleString("en-US")}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                        Paid
                      </div>
                      <div className="font-bold text-emerald-700">
                        ৳
                        {Math.round(
                          Number(student.payment_received || 0)
                        ).toLocaleString("en-US")}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-[10px] text-primary font-semibold uppercase">
                        Due
                      </div>
                      <div className="font-bold text-primary">
                        ৳
                        {Math.round(
                          Number(student.payment_due || 0)
                        ).toLocaleString("en-US")}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <Link
                      href={`/students/${student.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5 text-secondary" />
                      <span>{student.attachment_count || 0} Docs</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/students/${student.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      <Link
                        href={`/students/${student.id}/edit`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === student.id}
                        onClick={() =>
                          handleDeleteStudent(
                            student.id,
                            student.applicant_name
                          )
                        }
                        className="p-1.5 rounded-lg bg-rose-50 text-primary"
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. 12-INCH LAPTOP & DESKTOP COMPACT TABLE VIEW (>= 768px) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 pl-4 pr-2 w-[23%]">Student &amp; Contact</th>
                    <th className="py-3 px-2 w-[15%]">Category &amp; Sector</th>
                    <th className="py-3 px-2 w-[18%]">Organizations</th>
                    <th className="py-3 px-2 w-[15%]">Financials</th>
                    <th className="py-3 px-2 w-[15%]">Status &amp; Docs</th>
                    <th className="py-3 pl-2 pr-4 w-[14%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition align-middle"
                    >
                      {/* Col 1: Student & Contact */}
                      <td className="py-3 pl-4 pr-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-secondary/10 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-secondary">
                            {student.photo_path ? (
                              <img
                                src={student.photo_path}
                                alt={student.applicant_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (student.applicant_name || "S")
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/students/${student.id}`}
                                className="font-bold text-slate-900 hover:text-primary transition truncate"
                                title={student.applicant_name}
                              >
                                {student.applicant_name}
                              </Link>
                              {Boolean(student.is_draft) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  DRAFT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              #{student.id} • {student.gender}
                              {student.bd_phone ? ` • ${student.bd_phone}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Category & Sector */}
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.job_category === "SSW"
                              ? "bg-secondary text-white"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {student.job_category}
                        </span>
                        <div
                          className="font-bold text-slate-800 mt-0.5 truncate"
                          title={student.job_trade}
                        >
                          {student.job_trade}
                        </div>
                        {student.job_sub_category && (
                          <div
                            className="text-[10.5px] text-slate-500 truncate"
                            title={student.job_sub_category}
                          >
                            {student.job_sub_category}
                          </div>
                        )}
                      </td>

                      {/* Col 3: Organizations */}
                      <td className="py-3 px-2">
                        <div
                          className="font-semibold text-slate-800 flex items-center gap-1 truncate"
                          title={student.company_name}
                        >
                          <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="truncate">
                            {student.company_name || "Not specified"}
                          </span>
                        </div>
                        <div
                          className="text-[11px] text-slate-500 mt-0.5 truncate"
                          title={student.supervising_organization}
                        >
                          Sup: {student.supervising_organization || "—"}
                        </div>
                      </td>

                      {/* Col 4: Financials */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="space-y-0.5 leading-tight">
                          <div className="text-slate-600">
                            Total:{" "}
                            <strong className="text-slate-900">
                              ৳
                              {Math.round(
                                Number(student.total_amount || 0)
                              ).toLocaleString("en-US")}
                            </strong>
                          </div>
                          <div className="text-emerald-700 font-semibold">
                            Paid: ৳
                            {Math.round(
                              Number(student.payment_received || 0)
                            ).toLocaleString("en-US")}
                          </div>
                          <div
                            className={`font-bold ${
                              Number(student.payment_due) > 0
                                ? "text-primary"
                                : "text-secondary"
                            }`}
                          >
                            Due: ৳
                            {Math.round(
                              Number(student.payment_due || 0)
                            ).toLocaleString("en-US")}
                          </div>
                        </div>
                      </td>

                      {/* Col 5: Status & Docs */}
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-start gap-1">
                          <select
                            value={student.status}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                student.id,
                                e.target.value
                              )
                            }
                            className={`max-w-full px-2 py-1 rounded-full text-[11px] font-bold border cursor-pointer focus:outline-none truncate ${getStatusColor(
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

                          <Link
                            href={`/students/${student.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-secondary hover:text-white text-slate-600 text-[10.5px] font-semibold transition"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>{student.attachment_count || 0} files</span>
                          </Link>
                        </div>
                      </td>

                      {/* Col 6: Actions */}
                      <td className="py-3 pl-2 pr-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            href={`/students/${student.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-[11px] font-semibold transition"
                            title="View Profile & Attachments"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">View</span>
                          </Link>

                          <Link
                            href={`/students/${student.id}/edit`}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition"
                            title="Edit Student"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Edit</span>
                          </Link>

                          <button
                            type="button"
                            disabled={deletingId === student.id}
                            onClick={() =>
                              handleDeleteStudent(
                                student.id,
                                student.applicant_name
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-50 text-primary hover:bg-primary hover:text-white transition disabled:opacity-40"
                            title="Delete Student"
                          >
                            {deletingId === student.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteStudent}
        title="Delete Student Record?"
        message="Are you sure you want to permanently delete this student record along with all payment records and uploaded files from the server? This action cannot be undone."
        itemName={deleteTarget?.name}
        confirmText="Delete Record"
        loading={deletingId !== null}
      />
    </AppShell>
  );
}

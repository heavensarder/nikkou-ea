"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "./AppShell";
import { StudentRecord, STUDENT_STATUSES } from "@/lib/constants";
import {
  Users,
  PlaneTakeoff,
  Clock,
  FileEdit,
  Wallet,
  TrendingUp,
  AlertCircle,
  UserPlus,
  ArrowRight,
  Eye,
  Edit3,
  Briefcase,
  Building2,
  FileText,
  Loader2,
} from "lucide-react";

interface DashboardStats {
  total_records: number;
  active_students: number;
  draft_students: number;
  in_japan_count: number;
  in_process_count: number;
  titp_count: number;
  ssw_count: number;
  total_receivable: number;
  total_received: number;
  total_due: number;
}

export default function DashboardClient() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_records: 0,
    active_students: 0,
    draft_students: 0,
    in_japan_count: 0,
    in_process_count: 0,
    titp_count: 0,
    ssw_count: 0,
    total_receivable: 0,
    total_received: 0,
    total_due: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/students");
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function getStatusBadge(status: string) {
    const found = STUDENT_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <AppShell
      title="Dashboard Overview"
      subtitle="Nikkou Centre Japanese Language School — Placement & Accounting Summary"
    >
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-secondary">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-xs sm:text-sm font-semibold">
            Loading dashboard metrics...
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top KPI Cards (2 cols on mobile, 4 cols on 12-inch laptop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Active Students
                </p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-secondary mt-1">
                {Number(stats.active_students) || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total: {Number(stats.total_records) || 0}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 leading-tight">
                  Placed In Japan
                </p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <PlaneTakeoff className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
                {Number(stats.in_japan_count) || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Working in Japan
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-amber-700 leading-tight">
                  In Process
                </p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">
                {Number(stats.in_process_count) || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active pipeline
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  Saved Drafts
                </p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-700 mt-1">
                {Number(stats.draft_students) || 0}
              </p>
              <Link
                href="/students?draft=draft"
                className="text-[11px] text-primary font-semibold hover:underline mt-0.5 inline-block"
              >
                View drafts →
              </Link>
            </div>
          </div>

          {/* Financial Overview & Program Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Financial Summary */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm sm:text-base font-bold text-secondary">
                    Employment Accounts &amp; Payment Summary
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  Published Records
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Total Receivable
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-secondary mt-1 truncate">
                    ৳{" "}
                    {Math.round(
                      Number(stats.total_receivable || 0)
                    ).toLocaleString("en-US")}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Total Received</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-1 truncate">
                    ৳{" "}
                    {Math.round(
                      Number(stats.total_received || 0)
                    ).toLocaleString("en-US")}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Payment Due</span>
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-primary mt-1 truncate">
                    ৳{" "}
                    {Math.round(Number(stats.total_due || 0)).toLocaleString(
                      "en-US"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Job Category Breakdown */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm sm:text-base font-bold text-secondary">
                    Job Category Breakdown
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-secondary">
                        TITP / ESD Program
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Agriculture, Construction, Food Processing
                      </p>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-primary shrink-0">
                      {Number(stats.titp_count) || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-secondary">
                        SSW Program
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Caregiver, Agriculture, Construction, Cleaning, Driver
                      </p>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-secondary shrink-0">
                      {Number(stats.ssw_count) || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Student Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-secondary">
                  Recent Student Placement Records
                </h3>
                <p className="text-[11px] text-slate-500">
                  Latest students added or updated in Nikkou Centre
                </p>
              </div>
              <Link
                href="/students"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {students.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-800">
                  No Student Records Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Start keeping records of Nikkou Centre students placed in
                  Japan by creating your first student profile.
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
                {/* Mobile Card List (< 768px) */}
                <div className="divide-y divide-slate-200 md:hidden">
                  {students.slice(0, 6).map((student) => (
                    <div key={student.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-secondary/10 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-secondary">
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
                            <Link
                              href={`/students/${student.id}`}
                              className="font-bold text-xs sm:text-sm text-slate-900 hover:text-primary truncate block"
                            >
                              {student.applicant_name}
                            </Link>
                            <p className="text-[11px] text-slate-500 truncate">
                              {student.job_category} • {student.job_trade}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusBadge(
                            student.status
                          )}`}
                        >
                          {student.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-slate-500">Due: </span>
                          <strong
                            className={
                              Number(student.payment_due) > 0
                                ? "text-primary"
                                : "text-emerald-700"
                            }
                          >
                            ৳
                            {Math.round(
                              Number(student.payment_due || 0)
                            ).toLocaleString("en-US")}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/students/${student.id}`}
                            className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold"
                          >
                            View
                          </Link>
                          <Link
                            href={`/students/${student.id}/edit`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 12-inch Laptop & Desktop Fixed-Width Table (>= 768px) */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 pl-4 pr-2 w-[25%]">Applicant</th>
                        <th className="py-3 px-2 w-[18%]">Job Category</th>
                        <th className="py-3 px-2 w-[20%]">Organizations</th>
                        <th className="py-3 px-2 w-[14%]">Status</th>
                        <th className="py-3 px-2 w-[13%]">Payment Due</th>
                        <th className="py-3 pl-2 pr-4 w-[10%] text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {students.slice(0, 8).map((student) => (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/80 transition align-middle"
                        >
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
                              <div className="min-w-0">
                                <Link
                                  href={`/students/${student.id}`}
                                  className="font-bold text-slate-900 hover:text-primary transition flex items-center gap-1.5 truncate"
                                >
                                  <span className="truncate">
                                    {student.applicant_name}
                                  </span>
                                  {Boolean(student.is_draft) && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                      DRAFT
                                    </span>
                                  )}
                                </Link>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {student.gender} •{" "}
                                  {student.bd_phone || "No BD Phone"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-2">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary">
                              {student.job_category}
                            </span>
                            <div className="font-semibold text-slate-700 mt-0.5 truncate">
                              {student.job_trade}
                              {student.job_sub_category
                                ? ` (${student.job_sub_category})`
                                : ""}
                            </div>
                          </td>

                          <td className="py-3 px-2">
                            <div className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {student.company_name || "—"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              Sup: {student.supervising_organization || "—"}
                            </div>
                          </td>

                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border truncate max-w-full ${getStatusBadge(
                                student.status
                              )}`}
                            >
                              {student.status}
                            </span>
                          </td>

                          <td className="py-3 px-2 whitespace-nowrap">
                            <div
                              className={`font-bold ${
                                Number(student.payment_due) > 0
                                  ? "text-primary"
                                  : "text-emerald-700"
                              }`}
                            >
                              ৳
                              {Math.round(
                                Number(student.payment_due || 0)
                              ).toLocaleString("en-US")}
                            </div>
                            <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{student.attachment_count || 0} docs</span>
                            </div>
                          </td>

                          <td className="py-3 pl-2 pr-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                href={`/students/${student.id}`}
                                className="p-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition"
                                title="View Student Profile & Attachments"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <Link
                                href={`/students/${student.id}/edit`}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-primary hover:text-white transition"
                                title="Edit Student"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>
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
        </div>
      )}
    </AppShell>
  );
}

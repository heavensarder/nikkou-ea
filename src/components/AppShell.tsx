"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ChevronDown,
  ChevronRight,
  ListFilter,
  UserPlus,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AppShell({
  children,
  title,
  subtitle,
  actions,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isDashboard = pathname === "/dashboard";
  const isStudentsSection = pathname?.startsWith("/students");
  const isStudentList =
    pathname === "/students" ||
    (pathname?.startsWith("/students/") && pathname !== "/students/create");
  const isCreateStudent = pathname === "/students/create";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200 select-none">
      {/* Brand Header (White Background with Full Logo) */}
      <div
        className={`border-b border-slate-200 bg-white flex items-center justify-center ${
          collapsed ? "px-2 py-3.5" : "px-4 py-3.5"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-full"
          title="Nikkou Centre — Japanese Language School"
        >
          {collapsed ? (
            <img
              src="/favicon.png"
              alt="Nikkou Centre"
              className="w-9 h-9 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://i.postimg.cc/ZYwdBC75/Nikkou-logo.png";
              }}
            />
          ) : (
            <img
              src="/nikkou-logo.png"
              alt="Nikkou Centre Logo"
              className="w-full max-w-[180px] h-12 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://i.postimg.cc/7Pdx3FCD/nikkou-logo.png";
              }}
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1.5">
        {!collapsed && (
          <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </p>
        )}

        {/* Dashboard */}
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          title="Dashboard"
          className={`flex items-center ${
            collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
          } rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isDashboard
              ? "bg-primary text-white shadow-sm shadow-primary/25"
              : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Students Group */}
        <div className="pt-1">
          {collapsed ? (
            <div className="space-y-1">
              <Link
                href="/students"
                onClick={() => setMobileOpen(false)}
                title="Student List"
                className={`flex items-center justify-center px-2 py-2.5 rounded-xl transition-all ${
                  isStudentList
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                }`}
              >
                <ListFilter className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/students/create"
                onClick={() => setMobileOpen(false)}
                title="Create a New Student"
                className={`flex items-center justify-center px-2 py-2.5 rounded-xl transition-all ${
                  isCreateStudent
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStudentsMenuOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isStudentsSection
                    ? "bg-slate-100 text-secondary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Students</span>
                </div>
                {studentsMenuOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {studentsMenuOpen && (
                <div className="mt-1.5 ml-3.5 pl-2.5 border-l-2 border-slate-200 space-y-1">
                  <Link
                    href="/students"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isStudentList
                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                        : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Student List</span>
                  </Link>

                  <Link
                    href="/students/create"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isCreateStudent
                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                        : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Create a New Student</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Placement Program Info Box */}
      {!collapsed && (
        <div className="px-3 py-2.5 mx-2.5 mb-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-secondary mb-0.5">
            <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">Japan Placement Portal</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            TITP / ESD &amp; SSW Student Records
          </p>
        </div>
      )}

      {/* User & Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <div
          className={`flex items-center ${
            collapsed ? "flex-col gap-2" : "justify-between gap-2"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  admin-nikkou
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  ● Admin
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-primary hover:border-primary hover:text-white transition shrink-0 shadow-2xs"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop / 12-inch Laptop Left Sidebar (Compact 224px or Collapsed 64px) */}
      <aside
        className={`hidden lg:block shrink-0 fixed inset-y-0 left-0 z-30 shadow-xs transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile & Tablet Drawer (< 1024px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[82vw] h-full z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-56"
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3">
          {/* Mobile Brand Bar (< lg) — Centered Logo */}
          <div className="relative flex lg:hidden items-center justify-center pb-2.5 mb-2 border-b border-slate-100 min-h-[42px]">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="absolute left-0 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="flex items-center justify-center">
              <img
                src="/nikkou-logo.png"
                alt="Nikkou Centre"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://i.postimg.cc/7Pdx3FCD/nikkou-logo.png";
                }}
              />
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-2.5 min-w-0">
            {/* Desktop / 12-inch Laptop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden lg:inline-flex p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-secondary hover:bg-slate-100 transition shrink-0"
              title={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar for more screen space"
              }
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <div className="min-w-0 text-center lg:text-left">
              {title && (
                <h2 className="text-sm sm:text-lg font-bold text-secondary tracking-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

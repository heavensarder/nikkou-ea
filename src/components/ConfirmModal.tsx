"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  loading = false,
  variant = "danger",
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#ff2d32] via-[#b8324f] to-[#2c4c80]" />

        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  variant === "danger"
                    ? "bg-rose-50 border-rose-200 text-primary"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                }`}
              >
                {variant === "danger" ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {title}
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Confirmation Required
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-4 space-y-2.5">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {message}
            </p>
            {itemName && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-secondary break-all">
                {itemName}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold shadow-md shadow-primary/25 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

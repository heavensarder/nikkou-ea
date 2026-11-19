"use client";

import React from "react";
import { X, Download, ExternalLink, FileText } from "lucide-react";

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  title?: string | null;
  mimeType?: string;
}

export default function AttachmentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  title,
  mimeType,
}: AttachmentPreviewModalProps) {
  if (!isOpen || !fileUrl) return null;

  const lowerName = (fileName || fileUrl).toLowerCase();
  const isImage =
    mimeType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName);
  const isPdf =
    mimeType === "application/pdf" || /\.pdf$/i.test(lowerName);

  const downloadUrl = `${fileUrl}${
    fileUrl.includes("?") ? "&" : "?"
  }download=1&name=${encodeURIComponent(fileName || "document")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-secondary text-white">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm sm:text-base font-semibold truncate">
              {title || fileName || "Document Preview"}
            </h3>
            {title && fileName && (
              <p className="text-[11px] text-slate-200 truncate">{fileName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>
            <a
              href={downloadUrl}
              download={fileName}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-2 sm:p-4 min-h-[300px] sm:min-h-[420px]">
          {isImage ? (
            <img
              src={fileUrl}
              alt={title || fileName}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={title || fileName}
              className="w-full h-[72vh] rounded-lg border border-slate-300 bg-white"
            />
          ) : (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-slate-800 mb-1 break-all">
                {fileName}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mb-5">
                This file format cannot be rendered inline. You can download it
                or open it directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-hover transition"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Browser
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

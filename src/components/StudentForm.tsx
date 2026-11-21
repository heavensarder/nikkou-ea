"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ATTACHMENT_TYPES,
  formatAttachmentFileName,
  GENDER_OPTIONS,
  getAttachmentLabel,
  JOB_CATEGORIES,
  JobProgramType,
  PaymentInstallment,
  STUDENT_STATUSES,
  StudentRecord,
} from "@/lib/constants";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import ConfirmModal from "./ConfirmModal";
import DocumentScannerModal from "./DocumentScannerModal";
import {
  Upload,
  Trash2,
  Eye,
  Download,
  Plus,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Calculator,
  Building2,
  Phone,
  Mail,
  Globe,
  User,
  Briefcase,
  Save,
  FileEdit,
  AlertCircle,
  Loader2,
  Calendar,
  Wallet,
  MapPin,
  Camera,
} from "lucide-react";

export interface FormAttachmentItem {
  id?: number;
  tempId: string;
  attachment_type: string;
  title: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

interface StudentFormProps {
  initialData?: StudentRecord;
  isEditMode?: boolean;
}

export default function StudentForm({
  initialData,
  isEditMode = false,
}: StudentFormProps) {
  const router = useRouter();

  // Basic Info
  const [applicantName, setApplicantName] = useState(
    initialData?.applicant_name || ""
  );
  const [photoPath, setPhotoPath] = useState<string | null>(
    initialData?.photo_path || null
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);

  // Job Category
  const [jobCategory, setJobCategory] = useState<JobProgramType>(
    (initialData?.job_category as JobProgramType) || "TITP/ESD"
  );
  const [jobTrade, setJobTrade] = useState<string>(
    initialData?.job_trade || "Agriculture"
  );
  const [jobSubCategory, setJobSubCategory] = useState<string>(
    initialData?.job_sub_category || "General Crop Farming"
  );

  // Details
  const [gender, setGender] = useState<string>(initialData?.gender || "Male");
  const [companyName, setCompanyName] = useState<string>(
    initialData?.company_name || ""
  );
  const [companyAddress, setCompanyAddress] = useState<string>(
    initialData?.company_address || ""
  );
  const [supervisingOrg, setSupervisingOrg] = useState<string>(
    initialData?.supervising_organization || ""
  );

  // Auto-saved organization suggestions
  const [savedCompanies, setSavedCompanies] = useState<string[]>([]);
  const [savedCompanyAddresses, setSavedCompanyAddresses] = useState<
    Record<string, string>
  >({});
  const [savedSupervisingOrgs, setSavedSupervisingOrgs] = useState<string[]>(
    []
  );
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [showSupervisingSuggestions, setShowSupervisingSuggestions] =
    useState(false);

  // Status
  const [status, setStatus] = useState<string>(
    initialData?.status || "In Process"
  );

  // Financials
  const [totalAmount, setTotalAmount] = useState<string>(
    initialData?.total_amount !== undefined &&
      Number(initialData.total_amount) > 0
      ? String(Math.round(Number(initialData.total_amount)))
      : ""
  );
  const [payments, setPayments] = useState<PaymentInstallment[]>(() => {
    if (initialData?.payments && initialData.payments.length > 0) {
      return initialData.payments.map((p) => ({
        id: p.id,
        amount: Math.round(Number(p.amount) || 0),
        payment_date: p.payment_date || new Date().toISOString().slice(0, 10),
        note: p.note || "",
      }));
    }
    return [
      {
        amount: 0,
        payment_date: new Date().toISOString().slice(0, 10),
        note: "1st Installment",
      },
    ];
  });

  // Contacts
  const [bdPhone, setBdPhone] = useState<string>(initialData?.bd_phone || "");
  const [jpPhone, setJpPhone] = useState<string>(initialData?.jp_phone || "");
  const [email, setEmail] = useState<string>(initialData?.email || "");
  const [whatsapp, setWhatsapp] = useState<string>(initialData?.whatsapp || "");
  const [facebook, setFacebook] = useState<string>(initialData?.facebook || "");

  // Attachments
  const [attachments, setAttachments] = useState<FormAttachmentItem[]>(() => {
    if (initialData?.attachments && initialData.attachments.length > 0) {
      return initialData.attachments.map((att) => ({
        id: att.id,
        tempId: `existing-${att.id}`,
        attachment_type: att.attachment_type,
        title: att.title || "",
        file_name: att.file_name,
        file_path: att.file_path,
        mime_type: att.mime_type,
        file_size: Number(att.file_size) || 0,
      }));
    }
    return [];
  });

  // Track pending title inputs for multi-upload categories (medical_reports, educational_certificates)
  const [pendingTitles, setPendingTitles] = useState<Record<string, string>>({
    medical_reports: "",
    educational_certificates: "",
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState<{
    fileUrl: string;
    fileName: string;
    title?: string | null;
    mimeType?: string;
  } | null>(null);

  // Confirm Delete Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    itemName?: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Form Submission & Auto-Save state
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(
    initialData?.id || null
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Mobile Camera Scanner Modal state
  const [scannerSession, setScannerSession] = useState<{
    attachmentKey: string;
    label: string;
    multiple: boolean;
    requiresTitle: boolean;
    file: File;
  } | null>(null);

  // Load saved Company Names and Supervising Organizations
  useEffect(() => {
    async function fetchSavedOrgs() {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.companies)) {
            setSavedCompanies(data.companies);
          }
          if (
            data.companyAddresses &&
            typeof data.companyAddresses === "object"
          ) {
            setSavedCompanyAddresses(data.companyAddresses);
          }
          if (Array.isArray(data.supervisingOrganizations)) {
            setSavedSupervisingOrgs(data.supervisingOrganizations);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchSavedOrgs();
  }, []);

  async function autoSaveOrganization(
    type: "company" | "supervising",
    value: string,
    addressValue?: string
  ) {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (type === "company") {
      const trimmedAddr = (addressValue ?? companyAddress).trim();
      setSavedCompanies((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed].sort()
      );
      if (trimmedAddr) {
        setSavedCompanyAddresses((prev) => ({
          ...prev,
          [trimmed]: trimmedAddr,
        }));
      }
      try {
        await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_name: trimmed,
            company_address: trimmedAddr,
          }),
        });
      } catch {
        // ignore
      }
    } else {
      setSavedSupervisingOrgs((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed].sort()
      );
      try {
        await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supervising_organization: trimmed }),
        });
      } catch {
        // ignore
      }
    }
  }

  function removeOrganizationSuggestion(
    type: "company" | "supervising",
    name: string
  ) {
    setConfirmDialog({
      title:
        type === "company"
          ? "Remove Company Suggestion?"
          : "Remove Supervising Organization?",
      message:
        "This organization will be removed from the saved autocomplete suggestions list.",
      itemName: name,
      confirmText: "Remove Suggestion",
      onConfirm: async () => {
        if (type === "company") {
          setSavedCompanies((prev) => prev.filter((c) => c !== name));
        } else {
          setSavedSupervisingOrgs((prev) => prev.filter((s) => s !== name));
        }
        setConfirmDialog(null);

        try {
          await fetch("/api/organizations", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ org_type: type, name }),
          });
        } catch {
          // ignore
        }
      },
    });
  }

  async function deleteFileFromServer(filePath: string | null | undefined, attachmentId?: number) {
    if (!filePath) return;
    try {
      if (attachmentId) {
        await fetch(`/api/attachments/${attachmentId}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filePath }),
        });
      }
    } catch {
      // ignore
    }
  }

  // Financial Calculations
  const parsedTotalAmount = Number(totalAmount) || 0;
  const totalPaymentReceived = payments.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const paymentDue = parsedTotalAmount - totalPaymentReceived;

  // Handle Job Category Change
  function handleProgramChange(program: JobProgramType) {
    setJobCategory(program);
    const firstTrade = JOB_CATEGORIES[program][0];
    setJobTrade(firstTrade.value);
    if (firstTrade.subCategories && firstTrade.subCategories.length > 0) {
      setJobSubCategory(firstTrade.subCategories[0].value);
    } else {
      setJobSubCategory("");
    }
  }

  function handleTradeChange(tradeValue: string) {
    setJobTrade(tradeValue);
    const tradeObj = JOB_CATEGORIES[jobCategory].find(
      (t) => t.value === tradeValue
    );
    if (tradeObj?.subCategories && tradeObj.subCategories.length > 0) {
      setJobSubCategory(tradeObj.subCategories[0].value);
    } else {
      setJobSubCategory("");
    }
  }

  // Background Auto-Save whenever an attachment or photo is uploaded or removed
  async function autoSaveRecord(
    overridePhotoPath?: string | null,
    overrideAttachments?: FormAttachmentItem[]
  ) {
    const activePhoto =
      overridePhotoPath !== undefined ? overridePhotoPath : photoPath;
    const activeAttachments =
      overrideAttachments !== undefined ? overrideAttachments : attachments;

    const activeTradeObj = JOB_CATEGORIES[jobCategory].find(
      (t) => t.value === jobTrade
    );
    const hasSub =
      activeTradeObj?.subCategories && activeTradeObj.subCategories.length > 0;

    // If creating a new student and applicantName isn't filled yet, auto-save as draft so it never fails validation
    const isDraftFlag = !applicantName.trim()
      ? true
      : initialData
      ? Boolean(initialData.is_draft)
      : false;

    setAutoSaveStatus("saving");
    try {
      const payload = {
        applicant_name: applicantName.trim() || "Untitled Draft Student",
        photo_path: activePhoto,
        job_category: jobCategory,
        job_trade: jobTrade,
        job_sub_category: hasSub ? jobSubCategory : null,
        gender,
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        supervising_organization: supervisingOrg.trim(),
        total_amount: parsedTotalAmount,
        payments: payments.map((p) => ({
          amount: Number(p.amount) || 0,
          payment_date:
            p.payment_date || new Date().toISOString().slice(0, 10),
          note: p.note || "",
        })),
        bd_phone: bdPhone.trim(),
        jp_phone: jpPhone.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        facebook: facebook.trim(),
        status,
        is_draft: isDraftFlag,
        attachments: activeAttachments.map((a) => ({
          attachment_type: a.attachment_type,
          title: a.title || null,
          file_name: formatAttachmentFileName(
            applicantName,
            a.title || getAttachmentLabel(a.attachment_type),
            a.file_path || a.file_name
          ),
          file_path: a.file_path,
          mime_type: a.mime_type,
          file_size: a.file_size,
        })),
      };

      const url = currentStudentId
        ? `/api/students/${currentStudentId}`
        : "/api/students";
      const method = currentStudentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (!currentStudentId && data.id) {
          setCurrentStudentId(data.id);
        }
        setAutoSaveStatus("saved");
      } else {
        setAutoSaveStatus("idle");
      }
    } catch {
      setAutoSaveStatus("idle");
    }
  }

  // Handle Applicant Photo Upload
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

  async function uploadPhotoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Applicant photo must be an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `Photo "${file.name}" (${sizeMb} MB) exceeds the 5 MB file size limit.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPhotoUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "photos");
      formData.append(
        "custom_name",
        formatAttachmentFileName(applicantName, "Applicant Photo", file.name)
      );

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload photo");
      }
      const previousPhoto = photoPath;
      const newPhotoUrl = data.file.file_path;
      setPhotoPath(newPhotoUrl);
      if (previousPhoto && previousPhoto !== newPhotoUrl) {
        deleteFileFromServer(previousPhoto);
      }
      await autoSaveRecord(newPhotoUrl, undefined);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload applicant photo"
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  // Handle Attachment Upload (Supports single and multiple files via click or drag-and-drop)
  async function handleAttachmentFiles(
    attachmentKey: string,
    fileList: FileList | File[],
    isMultiple: boolean,
    requiresTitle: boolean
  ) {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    const targetFiles = isMultiple ? filesArray : [filesArray[0]];

    for (const file of targetFiles) {
      if (file.size > MAX_UPLOAD_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMessage(
          `File "${file.name}" (${sizeMb} MB) exceeds the maximum allowed upload size of 5 MB.`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setUploadingKey(attachmentKey);
    setErrorMessage(null);

    try {
      const uploadedItems: FormAttachmentItem[] = [];
      const defaultTitle = (pendingTitles[attachmentKey] || "").trim();
      const categoryLabel = getAttachmentLabel(attachmentKey);
      const existingCount = attachments.filter(
        (a) => a.attachment_type === attachmentKey
      ).length;

      for (let i = 0; i < targetFiles.length; i++) {
        const file = targetFiles[i];
        const itemTitle = requiresTitle
          ? defaultTitle
            ? targetFiles.length > 1
              ? `${defaultTitle} ${i + 1}`
              : defaultTitle
            : `${categoryLabel} ${existingCount + i + 1}`
          : "";

        const formattedName = formatAttachmentFileName(
          applicantName,
          itemTitle || categoryLabel,
          file.name
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "attachments");
        formData.append("custom_name", formattedName);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        uploadedItems.push({
          tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          attachment_type: attachmentKey,
          title: itemTitle,
          file_name: formattedName,
          file_path: data.file.file_path,
          mime_type: data.file.mime_type,
          file_size: data.file.file_size,
        });
      }

      if (!isMultiple) {
        const replaced = attachments.filter(
          (a) => a.attachment_type === attachmentKey
        );
        for (const oldAtt of replaced) {
          deleteFileFromServer(oldAtt.file_path, oldAtt.id);
        }
      }

      const nextAttachmentsList = !isMultiple
        ? [
            ...attachments.filter((a) => a.attachment_type !== attachmentKey),
            ...uploadedItems,
          ]
        : [...attachments, ...uploadedItems];

      setAttachments(nextAttachmentsList);

      if (requiresTitle) {
        setPendingTitles((prev) => ({ ...prev, [attachmentKey]: "" }));
      }

      // Auto-save student record immediately after attachment upload
      await autoSaveRecord(undefined, nextAttachmentsList);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload attachment"
      );
    } finally {
      setUploadingKey(null);
    }
  }

  function handleUpdateAttachmentTitle(tempId: string, newTitle: string) {
    setAttachments((prev) =>
      prev.map((att) =>
        att.tempId === tempId
          ? {
              ...att,
              title: newTitle,
              file_name: formatAttachmentFileName(
                applicantName,
                newTitle || getAttachmentLabel(att.attachment_type),
                att.file_path || att.file_name
              ),
            }
          : att
      )
    );
  }

  function handleDeleteAttachment(tempId: string) {
    const target = attachments.find((att) => att.tempId === tempId);
    if (!target) return;
    const displayName = formatAttachmentFileName(
      applicantName,
      target.title || getAttachmentLabel(target.attachment_type),
      target.file_path || target.file_name
    );

    setConfirmDialog({
      title: "Delete Attachment?",
      message:
        "Are you sure you want to delete this attachment? It will also be permanently removed from the server storage.",
      itemName: displayName,
      confirmText: "Delete Document",
      onConfirm: async () => {
        deleteFileFromServer(target.file_path, target.id);
        const updatedList = attachments.filter((att) => att.tempId !== tempId);
        setAttachments(updatedList);
        setConfirmDialog(null);
        await autoSaveRecord(undefined, updatedList);
      },
    });
  }

  function handleDeletePhoto() {
    if (!photoPath) return;
    setConfirmDialog({
      title: "Delete Applicant Photo?",
      message:
        "Are you sure you want to remove the applicant photo? The image file will also be deleted from server storage.",
      itemName: formatAttachmentFileName(
        applicantName,
        "Applicant Photo",
        photoPath
      ),
      confirmText: "Delete Photo",
      onConfirm: async () => {
        deleteFileFromServer(photoPath);
        setPhotoPath(null);
        setConfirmDialog(null);
        await autoSaveRecord(null, undefined);
      },
    });
  }

  // Payment Installments Handlers
  function addPaymentRow() {
    setPayments((prev) => [
      ...prev,
      {
        amount: 0,
        payment_date: new Date().toISOString().slice(0, 10),
        note: `Installment #${prev.length + 1}`,
      },
    ]);
  }

  function updatePaymentRow(
    index: number,
    field: keyof PaymentInstallment,
    value: string | number
  ) {
    setPayments((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  }

  function removePaymentRow(index: number) {
    const row = payments[index];
    if (row && Number(row.amount) > 0) {
      setConfirmDialog({
        title: "Remove Payment Entry?",
        message: "Are you sure you want to remove this payment installment entry?",
        itemName: `Installment #${index + 1} — ৳${Math.round(
          Number(row.amount)
        ).toLocaleString("en-US")} (${row.payment_date})`,
        confirmText: "Remove Entry",
        onConfirm: () => {
          setPayments((prev) => prev.filter((_, idx) => idx !== index));
          setConfirmDialog(null);
        },
      });
      return;
    }
    setPayments((prev) => prev.filter((_, idx) => idx !== index));
  }

  function formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return "File";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Submit Form (Save as Draft or Publish/Update)
  async function handleSubmit(saveAsDraft: boolean) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!saveAsDraft && !applicantName.trim()) {
      setErrorMessage(
        "Applicant Name is required to publish a student record. (Or click 'Save as Draft' to save partial information)."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const activeTradeObj = JOB_CATEGORIES[jobCategory].find(
      (t) => t.value === jobTrade
    );
    const hasSub =
      activeTradeObj?.subCategories && activeTradeObj.subCategories.length > 0;

    setSubmitting(saveAsDraft ? "draft" : "publish");

    try {
      const payload = {
        applicant_name: applicantName.trim(),
        photo_path: photoPath,
        job_category: jobCategory,
        job_trade: jobTrade,
        job_sub_category: hasSub ? jobSubCategory : null,
        gender,
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        supervising_organization: supervisingOrg.trim(),
        total_amount: parsedTotalAmount,
        payments: payments.map((p) => ({
          amount: Number(p.amount) || 0,
          payment_date:
            p.payment_date || new Date().toISOString().slice(0, 10),
          note: p.note || "",
        })),
        bd_phone: bdPhone.trim(),
        jp_phone: jpPhone.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        facebook: facebook.trim(),
        status,
        is_draft: saveAsDraft,
        attachments: attachments.map((a) => ({
          attachment_type: a.attachment_type,
          title: a.title || null,
          file_name: formatAttachmentFileName(
            applicantName,
            a.title || getAttachmentLabel(a.attachment_type),
            a.file_path || a.file_name
          ),
          file_path: a.file_path,
          mime_type: a.mime_type,
          file_size: a.file_size,
        })),
      };

      const targetId = currentStudentId || initialData?.id;
      const url = targetId ? `/api/students/${targetId}` : "/api/students";
      const method = targetId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save student record");
      }

      setSuccessMessage(
        data.message ||
          (saveAsDraft
            ? "Student saved as draft!"
            : "Student record saved successfully!")
      );

      setTimeout(() => {
        router.push(`/students/${data.id}`);
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(null);
    }
  }

  const currentTrades = JOB_CATEGORIES[jobCategory] || [];
  const selectedTradeObj = currentTrades.find((t) => t.value === jobTrade);

  return (
    <div className="space-y-8 pb-16">
      {/* Feedback Banners */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shadow-xs">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      {/* Top Action Bar: Student Status & Draft/Publish Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Placement Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-secondary bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            >
              {STUDENT_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {initialData && (
            <div className="sm:pt-4">
              {Boolean(initialData.is_draft) ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  <FileEdit className="w-3 h-3" />
                  Draft
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Published
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleSubmit(true)}
            className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border-2 border-secondary text-secondary hover:bg-secondary hover:text-white text-xs sm:text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting === "draft" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <FileEdit className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleSubmit(false)}
            className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 transition disabled:opacity-50"
          >
            {submitting === "publish" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Save className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isEditMode ? "Update & Publish" : "Save & Publish"}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Applicant Photo & Personal Profile */}
      <div className="relative z-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="px-4 sm:px-6 py-3.5 bg-secondary/5 border-b border-slate-200 rounded-t-2xl flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
          <h3 className="text-sm sm:text-base font-bold text-secondary">
            Applicant Profile &amp; Photo
          </h3>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Drag and Drop Applicant Photo */}
          <div className="lg:col-span-4">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Applicant Photo (Drag &amp; Drop)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setPhotoDragOver(true);
              }}
              onDragLeave={() => setPhotoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setPhotoDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  uploadPhotoFile(e.dataTransfer.files[0]);
                }
              }}
              className={`relative rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                photoDragOver
                  ? "border-primary bg-primary/5"
                  : "border-slate-300 hover:border-secondary bg-slate-50/70"
              }`}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadPhotoFile(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
              />

              {photoUploading ? (
                <div className="py-8 flex flex-col items-center justify-center text-secondary">
                  <Loader2 className="w-7 h-7 animate-spin mb-2" />
                  <p className="text-xs font-medium">Uploading photo...</p>
                </div>
              ) : photoPath ? (
                <div className="space-y-3">
                  <div className="w-32 h-40 mx-auto rounded-xl overflow-hidden border-2 border-white shadow-md bg-white">
                    <img
                      src={photoPath}
                      alt="Applicant Photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewItem({
                          fileUrl: photoPath,
                          fileName: `${applicantName || "Applicant"}-Photo.jpg`,
                          title: "Applicant Photo",
                          mimeType: "image/jpeg",
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-xs font-semibold transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <a
                      href={`${photoPath}?download=1&name=${encodeURIComponent(
                        `${applicantName || "Applicant"}-Photo.jpg`
                      )}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold transition"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-primary hover:text-white text-xs font-semibold transition"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="py-5 cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-2.5">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    Drag &amp; drop applicant photo here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    or <span className="text-primary font-semibold underline">click to browse</span> (JPG, PNG, WEBP • Max 5 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Applicant Name, Gender, Organizations */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Applicant Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Enter full name of the student / applicant"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition ${
                      gender === g
                        ? "bg-secondary text-white border-secondary shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              >
                {STUDENT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Company Name (Implementing Organization)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={companyName}
                  onFocus={() => setShowCompanySuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCompanySuggestions(false), 180);
                    const trimmed = companyName.trim();
                    if (trimmed) {
                      const rememberedAddr = savedCompanyAddresses[trimmed];
                      if (rememberedAddr && !companyAddress.trim()) {
                        setCompanyAddress(rememberedAddr);
                        autoSaveOrganization("company", trimmed, rememberedAddr);
                      } else {
                        autoSaveOrganization("company", trimmed);
                      }
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCompanyName(val);
                    setShowCompanySuggestions(true);
                    if (savedCompanyAddresses[val.trim()]) {
                      setCompanyAddress(savedCompanyAddresses[val.trim()]);
                    }
                  }}
                  placeholder="Enter or select Japanese host company name"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />

                {showCompanySuggestions &&
                  savedCompanies.filter((c) =>
                    c.toLowerCase().includes(companyName.trim().toLowerCase())
                  ).length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Saved Implementing Companies
                      </div>
                      {savedCompanies
                        .filter((c) =>
                          c
                            .toLowerCase()
                            .includes(companyName.trim().toLowerCase())
                        )
                        .map((c) => (
                          <div
                            key={c}
                            className="flex items-center justify-between px-3 py-1.5 hover:bg-secondary/10 transition group"
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCompanyName(c);
                                if (savedCompanyAddresses[c]) {
                                  setCompanyAddress(savedCompanyAddresses[c]);
                                }
                                setShowCompanySuggestions(false);
                              }}
                              className="flex-1 text-left text-xs font-medium text-slate-700 group-hover:text-secondary flex items-start gap-2 min-w-0 py-0.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{c}</div>
                                {savedCompanyAddresses[c] && (
                                  <div className="text-[10.5px] text-slate-400 truncate">
                                    {savedCompanyAddresses[c]}
                                  </div>
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeOrganizationSuggestion("company", c);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-rose-50 transition shrink-0 ml-2"
                              title={`Remove "${c}" from suggestions`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Company Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  onBlur={() => {
                    if (companyName.trim() && companyAddress.trim()) {
                      autoSaveOrganization(
                        "company",
                        companyName,
                        companyAddress
                      );
                    }
                  }}
                  placeholder="Auto-fills for saved company or enter company address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>
            </div>

            <div className="relative sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Supervising Organization
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={supervisingOrg}
                  onFocus={() => setShowSupervisingSuggestions(true)}
                  onBlur={() => {
                    setTimeout(
                      () => setShowSupervisingSuggestions(false),
                      180
                    );
                    if (supervisingOrg.trim()) {
                      autoSaveOrganization("supervising", supervisingOrg);
                    }
                  }}
                  onChange={(e) => {
                    setSupervisingOrg(e.target.value);
                    setShowSupervisingSuggestions(true);
                  }}
                  placeholder="Enter or select supervising organization / union name"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />

                {showSupervisingSuggestions &&
                  savedSupervisingOrgs.filter((s) =>
                    s
                      .toLowerCase()
                      .includes(supervisingOrg.trim().toLowerCase())
                  ).length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Saved Supervising Organizations
                      </div>
                      {savedSupervisingOrgs
                        .filter((s) =>
                          s
                            .toLowerCase()
                            .includes(supervisingOrg.trim().toLowerCase())
                        )
                        .map((s) => (
                          <div
                            key={s}
                            className="flex items-center justify-between px-3 py-1.5 hover:bg-secondary/10 transition group"
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSupervisingOrg(s);
                                setShowSupervisingSuggestions(false);
                              }}
                              className="flex-1 text-left text-xs font-medium text-slate-700 group-hover:text-secondary flex items-center gap-2 min-w-0 py-0.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                              <span className="truncate">{s}</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeOrganizationSuggestion("supervising", s);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-rose-50 transition shrink-0 ml-2"
                              title={`Remove "${s}" from suggestions`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Job Category (TITP/ESD & SSW) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 bg-secondary/5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
            <h3 className="text-sm sm:text-base font-bold text-secondary">
              Job Category &amp; Occupational Sector
            </h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary text-white">
            Selected: {jobCategory} — {jobTrade}
            {selectedTradeObj?.subCategories && jobSubCategory
              ? ` (${jobSubCategory})`
              : ""}
          </span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Card 1: TITP/ESD */}
          <div
            className={`rounded-2xl border-2 p-5 transition-all ${
              jobCategory === "TITP/ESD"
                ? "border-primary bg-primary/[0.03] shadow-sm"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Program Category
                </span>
                <h4 className="text-lg font-bold text-secondary">
                  Job Category: TITP/ESD
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleProgramChange("TITP/ESD")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  jobCategory === "TITP/ESD"
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-secondary hover:text-white"
                }`}
              >
                {jobCategory === "TITP/ESD" ? "Active Program" : "Select TITP/ESD"}
              </button>
            </div>

            <div className="space-y-2.5">
              {JOB_CATEGORIES["TITP/ESD"].map((trade) => {
                const isSelected =
                  jobCategory === "TITP/ESD" && jobTrade === trade.value;
                return (
                  <label
                    key={trade.value}
                    onClick={() => {
                      setJobCategory("TITP/ESD");
                      setJobTrade(trade.value);
                      setJobSubCategory("");
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "bg-white border-primary text-secondary font-semibold shadow-xs"
                        : "bg-white/70 border-slate-200 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="job_trade_selection"
                      checked={isSelected}
                      onChange={() => {
                        setJobCategory("TITP/ESD");
                        setJobTrade(trade.value);
                        setJobSubCategory("");
                      }}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">{trade.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Card 2: SSW */}
          <div
            className={`rounded-2xl border-2 p-5 transition-all ${
              jobCategory === "SSW"
                ? "border-primary bg-primary/[0.03] shadow-sm"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Specified Skilled Worker
                </span>
                <h4 className="text-lg font-bold text-secondary">
                  Job Category: SSW
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleProgramChange("SSW")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  jobCategory === "SSW"
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-secondary hover:text-white"
                }`}
              >
                {jobCategory === "SSW" ? "Active Program" : "Select SSW"}
              </button>
            </div>

            <div className="space-y-2.5">
              {JOB_CATEGORIES["SSW"].map((trade) => {
                const isSelected =
                  jobCategory === "SSW" && jobTrade === trade.value;
                return (
                  <div key={trade.value} className="space-y-2">
                    <label
                      onClick={() => {
                        setJobCategory("SSW");
                        handleTradeChange(trade.value);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-white border-primary text-secondary font-semibold shadow-xs"
                          : "bg-white/70 border-slate-200 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="job_trade_selection"
                        checked={isSelected}
                        onChange={() => {
                          setJobCategory("SSW");
                          handleTradeChange(trade.value);
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">{trade.label}</span>
                    </label>

                    {/* Sub-categories for SSW -> Agriculture */}
                    {trade.subCategories && trade.subCategories.length > 0 && (
                      <div className="ml-7 pl-3.5 border-l-2 border-secondary/30 space-y-1.5">
                        {trade.subCategories.map((sub) => {
                          const isSubSelected =
                            isSelected && jobSubCategory === sub.value;
                          return (
                            <label
                              key={sub.value}
                              onClick={() => {
                                setJobCategory("SSW");
                                setJobTrade(trade.value);
                                setJobSubCategory(sub.value);
                              }}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs cursor-pointer transition ${
                                isSubSelected
                                  ? "bg-secondary text-white border-secondary font-semibold"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-secondary/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="job_sub_category_selection"
                                checked={isSubSelected}
                                onChange={() => {
                                  setJobCategory("SSW");
                                  setJobTrade(trade.value);
                                  setJobSubCategory(sub.value);
                                }}
                                className="w-3.5 h-3.5 accent-primary"
                              />
                              <span>{sub.label}</span>
                            </label>
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

      {/* SECTION 3: Financial & Multiple Payment Installments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-secondary/5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-secondary" />
            <h3 className="text-base font-bold text-secondary">
              Financial Records &amp; Payment Installments
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Payment Due is auto-calculated
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Amount to be Received */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Total Amount to be Received
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>
            </div>

            {/* Total Payment Received */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                Total Payment Received ({payments.filter((p) => Number(p.amount) > 0).length} entries)
              </span>
              <div className="text-2xl font-extrabold text-emerald-700">
                ৳ {Math.round(totalPaymentReceived).toLocaleString("en-US")}
              </div>
            </div>

            {/* Payment Due (Auto-calculated) */}
            <div
              className={`p-4 rounded-2xl border ${
                paymentDue > 0
                  ? "bg-rose-50/70 border-rose-200"
                  : "bg-blue-50/70 border-blue-200"
              }`}
            >
              <span
                className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  paymentDue > 0 ? "text-primary" : "text-secondary"
                }`}
              >
                Payment Due (Auto-calculated)
              </span>
              <div
                className={`text-2xl font-extrabold ${
                  paymentDue > 0 ? "text-primary" : "text-secondary"
                }`}
              >
                ৳ {Math.round(paymentDue).toLocaleString("en-US")}
              </div>
            </div>
          </div>

          {/* Payment Received List */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-secondary shrink-0" />
                <span>Payment Received History</span>
              </label>
              <button
                type="button"
                onClick={addPaymentRow}
                className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-white hover:bg-secondary-hover text-xs font-semibold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Payment Entry</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {payments.map((payment, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="sm:col-span-1 text-xs font-bold text-slate-500">
                    #{idx + 1}
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Amount Received
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={payment.amount ? Math.round(Number(payment.amount)) : ""}
                      onChange={(e) =>
                        updatePaymentRow(
                          idx,
                          "amount",
                          e.target.value === "" ? 0 : Number(e.target.value)
                        )
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Payment Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="date"
                        value={payment.payment_date}
                        onChange={(e) =>
                          updatePaymentRow(idx, "payment_date", e.target.value)
                        }
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Note / Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={payment.note || ""}
                      onChange={(e) =>
                        updatePaymentRow(idx, "note", e.target.value)
                      }
                      placeholder="e.g., Cash / Bank / 1st Installment"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-secondary"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => removePaymentRow(idx)}
                      disabled={payments.length === 1 && !payment.amount}
                      className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-rose-50 transition disabled:opacity-30"
                      title="Remove payment entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Contact & Social Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-secondary/5 border-b border-slate-200 flex items-center gap-2.5">
          <Phone className="w-5 h-5 text-secondary" />
          <h3 className="text-base font-bold text-secondary">
            Contact &amp; Communication Information
          </h3>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              BD Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={bdPhone}
                onChange={(e) => setBdPhone(e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              JP Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={jpPhone}
                onChange={(e) => setJpPhone(e.target.value)}
                placeholder="+81 XX-XXXX-XXXX"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Facebook Profile / Link
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Attachments (11 Document Categories with Drag & Drop + View/Download/Delete) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-4 bg-secondary/5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-secondary shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-secondary">
                Student Attachments &amp; Verification Documents
              </h3>
              <p className="text-xs text-slate-500">
                Select file or drag and drop PDF / Image / Document files (Max 5 MB per file). Uploaded fields are highlighted in green.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {autoSaveStatus === "saving" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-secondary border border-blue-200">
                <Loader2 className="w-3 h-3 animate-spin" />
                Auto-saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Auto-saved
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {
                ATTACHMENT_TYPES.filter((cfg) =>
                  attachments.some((a) => a.attachment_type === cfg.key)
                ).length
              }{" "}
              / {ATTACHMENT_TYPES.length} Categories Uploaded
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary">
              {attachments.length} Total File(s)
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* 1. Standard Single-Document Categories (9 items -> 3x3 symmetrical grid on desktop, 2-col on tablet) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ATTACHMENT_TYPES.filter((c) => !c.multiple).map((config) => {
              const matchingFiles = attachments.filter(
                (a) => a.attachment_type === config.key
              );
              const hasUploaded = matchingFiles.length > 0;
              const isUploading = uploadingKey === config.key;
              const isDragOver = dragOverKey === config.key;

              return (
                <div
                  key={config.key}
                  className={`rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    hasUploaded
                      ? "bg-emerald-50/85 border-2 border-emerald-400 shadow-sm ring-1 ring-emerald-500/10"
                      : "bg-slate-50/50 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition ${
                            hasUploaded
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {hasUploaded ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
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
                          <p
                            className={`text-[11px] mt-0.5 line-clamp-1 ${
                              hasUploaded
                                ? "text-emerald-700 font-medium"
                                : "text-slate-500"
                            }`}
                            title={config.description}
                          >
                            {config.description}
                          </p>
                        </div>
                      </div>

                      {hasUploaded ? (
                        <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-600 text-white shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-600 shrink-0">
                          Empty
                        </span>
                      )}
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverKey(config.key);
                      }}
                      onDragLeave={() => setDragOverKey(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          handleAttachmentFiles(
                            config.key,
                            e.dataTransfer.files,
                            config.multiple,
                            config.requiresTitle
                          );
                        }
                      }}
                      onClick={() => fileInputRefs.current[config.key]?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition ${
                        isDragOver
                          ? "border-primary bg-primary/5"
                          : hasUploaded
                          ? "border-emerald-300 bg-white/80 hover:border-emerald-500 hover:bg-white"
                          : "border-slate-300 hover:border-secondary bg-white hover:bg-secondary/[0.02]"
                      }`}
                    >
                      <input
                        ref={(el) => {
                          fileInputRefs.current[config.key] = el;
                        }}
                        type="file"
                        multiple={false}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAttachmentFiles(
                              config.key,
                              e.target.files,
                              config.multiple,
                              config.requiresTitle
                            );
                            e.target.value = "";
                          }
                        }}
                      />

                      {isUploading ? (
                        <div className="py-1 flex items-center justify-center gap-2 text-secondary text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
                          <Upload className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span>
                            {hasUploaded ? (
                              <>
                                <strong className="text-emerald-800">
                                  Replace file
                                </strong>{" "}
                                or drop new (Max 5 MB)
                              </>
                            ) : (
                              <>
                                <strong className="text-secondary">
                                  Drag &amp; drop
                                </strong>{" "}
                                or{" "}
                                <span className="text-primary font-semibold underline">
                                  browse
                                </span>{" "}
                                (Max 5 MB)
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mobile-Only Camera Capture & Auto-Scan Button */}
                    <div className="mt-2 md:hidden">
                      <input
                        ref={(el) => {
                          cameraInputRefs.current[config.key] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setScannerSession({
                              attachmentKey: config.key,
                              label: config.label,
                              multiple: config.multiple,
                              requiresTitle: config.requiresTitle,
                              file: e.target.files[0],
                            });
                            e.target.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() =>
                          cameraInputRefs.current[config.key]?.click()
                        }
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-secondary text-white hover:bg-secondary-hover text-xs font-bold shadow-2xs transition disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 shrink-0" />
                        <span>Capture &amp; Scan with Camera</span>
                      </button>
                    </div>

                    {/* Uploaded File Card */}
                    {hasUploaded && (
                      <div className="mt-2.5 space-y-2">
                        {matchingFiles.map((att) => {
                          const formattedFileName = formatAttachmentFileName(
                            applicantName,
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
                              key={att.tempId}
                              className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span
                                  className="text-xs font-bold text-slate-800 truncate flex-1"
                                  title={formattedFileName}
                                >
                                  {formattedFileName}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {formatFileSize(att.file_size)}
                                </span>
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
                                  onClick={() =>
                                    handleDeleteAttachment(att.tempId)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition"
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
                </div>
              );
            })}
          </div>

          {/* 2. Multi-Document Categories (Medical Reports & Educational Certificates -> 2-col side-by-side grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ATTACHMENT_TYPES.filter((c) => c.multiple).map((config) => {
              const matchingFiles = attachments.filter(
                (a) => a.attachment_type === config.key
              );
              const hasUploaded = matchingFiles.length > 0;
              const isUploading = uploadingKey === config.key;
              const isDragOver = dragOverKey === config.key;

              return (
                <div
                  key={config.key}
                  className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                    hasUploaded
                      ? "bg-emerald-50/85 border-2 border-emerald-400 shadow-sm ring-1 ring-emerald-500/10"
                      : "bg-slate-50/50 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition ${
                            hasUploaded
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {hasUploaded ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </span>
                        <div>
                          <h4
                            className={`text-sm font-bold ${
                              hasUploaded
                                ? "text-emerald-950"
                                : "text-slate-800"
                            }`}
                          >
                            {config.label}
                          </h4>
                          <p
                            className={`text-xs mt-0.5 ${
                              hasUploaded
                                ? "text-emerald-700 font-medium"
                                : "text-slate-500"
                            }`}
                          >
                            {config.description}
                          </p>
                        </div>
                      </div>

                      {hasUploaded ? (
                        <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          {matchingFiles.length}{" "}
                          {matchingFiles.length === 1 ? "file" : "files"}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-600 shrink-0">
                          Empty
                        </span>
                      )}
                    </div>

                    {/* Pre-upload Title Input */}
                    {config.requiresTitle && (
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Document Title (for next upload — editable below after upload)
                        </label>
                        <input
                          type="text"
                          value={pendingTitles[config.key] || ""}
                          onChange={(e) =>
                            setPendingTitles((prev) => ({
                              ...prev,
                              [config.key]: e.target.value,
                            }))
                          }
                          placeholder={
                            config.key === "medical_reports"
                              ? "e.g., Initial Medical Checkup / Final GAMCA Medical Report"
                              : "e.g., SSC Certificate / HSC Transcript / JLPT N4 Certificate"
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-secondary"
                        />
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverKey(config.key);
                      }}
                      onDragLeave={() => setDragOverKey(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          handleAttachmentFiles(
                            config.key,
                            e.dataTransfer.files,
                            config.multiple,
                            config.requiresTitle
                          );
                        }
                      }}
                      onClick={() => fileInputRefs.current[config.key]?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-3.5 text-center transition ${
                        isDragOver
                          ? "border-primary bg-primary/5"
                          : hasUploaded
                          ? "border-emerald-300 bg-white/80 hover:border-emerald-500 hover:bg-white"
                          : "border-slate-300 hover:border-secondary bg-white hover:bg-secondary/[0.02]"
                      }`}
                    >
                      <input
                        ref={(el) => {
                          fileInputRefs.current[config.key] = el;
                        }}
                        type="file"
                        multiple={true}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAttachmentFiles(
                              config.key,
                              e.target.files,
                              config.multiple,
                              config.requiresTitle
                            );
                            e.target.value = "";
                          }
                        }}
                      />

                      {isUploading ? (
                        <div className="py-1.5 flex items-center justify-center gap-2 text-secondary text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading document(s)...</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-600">
                          <Upload className="w-4 h-4 text-secondary shrink-0" />
                          <span>
                            <strong className="text-secondary">
                              Drag &amp; drop
                            </strong>{" "}
                            files here, or{" "}
                            <span className="text-primary font-semibold underline">
                              browse to add more
                            </span>{" "}
                            (PDF or Image • Max 5 MB)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mobile-Only Camera Capture & Auto-Scan Button */}
                    <div className="mt-2.5 md:hidden">
                      <input
                        ref={(el) => {
                          cameraInputRefs.current[config.key] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setScannerSession({
                              attachmentKey: config.key,
                              label: config.label,
                              multiple: config.multiple,
                              requiresTitle: config.requiresTitle,
                              file: e.target.files[0],
                            });
                            e.target.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() =>
                          cameraInputRefs.current[config.key]?.click()
                        }
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-secondary text-white hover:bg-secondary-hover text-xs font-bold shadow-2xs transition disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 shrink-0" />
                        <span>Capture &amp; Scan with Camera</span>
                      </button>
                    </div>

                    {/* Uploaded Files List */}
                    {hasUploaded && (
                      <div className="mt-3 space-y-2">
                        {matchingFiles.map((att) => {
                          const formattedFileName = formatAttachmentFileName(
                            applicantName,
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
                              key={att.tempId}
                              className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                {config.requiresTitle && (
                                  <input
                                    type="text"
                                    value={att.title}
                                    onChange={(e) =>
                                      handleUpdateAttachmentTitle(
                                        att.tempId,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter Document Title..."
                                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-secondary focus:outline-none focus:border-primary"
                                  />
                                )}
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span
                                    className="text-xs font-bold text-slate-800 truncate"
                                    title={formattedFileName}
                                  >
                                    {formattedFileName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    ({formatFileSize(att.file_size)})
                                  </span>
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
                                  onClick={() =>
                                    handleDeleteAttachment(att.tempId)
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition"
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Sticky / Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 sm:p-5 flex items-center justify-between gap-3">
        <div className="hidden lg:block text-xs text-slate-500">
          You can save an incomplete record as a <strong>Draft</strong> at any time, or <strong>Publish</strong> when ready.
        </div>

        <div className="flex items-center justify-end gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleSubmit(true)}
            className="flex-1 sm:flex-initial whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border-2 border-secondary text-secondary hover:bg-secondary hover:text-white text-xs sm:text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting === "draft" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <FileEdit className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => handleSubmit(false)}
            className="flex-1 sm:flex-initial whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 transition disabled:opacity-50"
          >
            {submitting === "publish" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Save className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isEditMode ? "Update & Publish" : "Save & Publish"}
            </span>
          </button>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        fileUrl={previewItem?.fileUrl || ""}
        fileName={previewItem?.fileName || ""}
        title={previewItem?.title}
        mimeType={previewItem?.mimeType}
      />

      {/* Custom Confirmation Modal for All Delete Actions */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => confirmDialog?.onConfirm()}
        title={confirmDialog?.title || "Confirm Delete"}
        message={
          confirmDialog?.message ||
          "Are you sure you want to delete this item? This action cannot be undone."
        }
        itemName={confirmDialog?.itemName}
        confirmText={confirmDialog?.confirmText || "Yes, Delete"}
      />

      {/* Mobile Camera Document Scanner Modal */}
      <DocumentScannerModal
        isOpen={Boolean(scannerSession)}
        imageFile={scannerSession?.file || null}
        documentLabel={scannerSession?.label || "Document"}
        onClose={() => setScannerSession(null)}
        onSaveScan={async (scannedFile) => {
          if (!scannerSession) return;
          await handleAttachmentFiles(
            scannerSession.attachmentKey,
            [scannedFile],
            scannerSession.multiple,
            scannerSession.requiresTitle
          );
        }}
      />
    </div>
  );
}

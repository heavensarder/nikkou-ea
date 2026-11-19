export const ADMIN_CREDENTIALS = {
  username: "admin-nikkou",
  password: "nikkoU_emplyment_accounts@#2026!",
};

export type JobProgramType = "TITP/ESD" | "SSW";

export interface JobTradeOption {
  label: string;
  value: string;
  subCategories?: { label: string; value: string }[];
}

export const JOB_CATEGORIES: Record<JobProgramType, JobTradeOption[]> = {
  "TITP/ESD": [
    { label: "Agriculture", value: "Agriculture" },
    { label: "Construction", value: "Construction" },
    { label: "Restaurant / Food Processing", value: "Restaurant / Food Processing" },
  ],
  SSW: [
    { label: "Nursing / Caregiver", value: "Nursing / Caregiver" },
    {
      label: "Agriculture",
      value: "Agriculture",
      subCategories: [
        { label: "General Crop Farming", value: "General Crop Farming" },
        { label: "General Livestock Farming", value: "General Livestock Farming" },
      ],
    },
    { label: "Construction", value: "Construction" },
    { label: "Building Cleaning", value: "Building Cleaning" },
    { label: "Driver", value: "Driver" },
  ],
};

export const STUDENT_STATUSES = [
  { value: "In Process", label: "In Process", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "Document Verification", label: "Document Verification", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "COE / Visa Processing", label: "COE / Visa Processing", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "Waiting for Flight", label: "Waiting for Flight", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "In Japan", label: "In Japan", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "Completed", label: "Completed", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "On Hold", label: "On Hold", color: "bg-rose-100 text-rose-800 border-rose-200" },
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

export interface AttachmentConfig {
  key: string;
  number: number;
  label: string;
  description: string;
  multiple: boolean;
  requiresTitle: boolean;
}

export const ATTACHMENT_TYPES: AttachmentConfig[] = [
  {
    key: "demand_letter",
    number: 1,
    label: "Demand Letter",
    description: "Official demand letter from the Japanese organization",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "contract_paper",
    number: 2,
    label: "Contract Paper",
    description: "Signed employment contract paper",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "employee_selection_certificate",
    number: 3,
    label: "Employee Selection Certificate",
    description: "Certificate confirming candidate selection",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "medical_reports",
    number: 4,
    label: "Medical Reports",
    description: "Upload multiple medical examination reports with custom titles",
    multiple: true,
    requiresTitle: true,
  },
  {
    key: "national_id_card",
    number: 5,
    label: "National ID Card",
    description: "Scanned copy or photo of National ID Card (NID)",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "passport_copy",
    number: 6,
    label: "Passport Copy",
    description: "Clear copy of applicant's valid passport",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "undertaking",
    number: 7,
    label: "Undertaking",
    description: "Signed undertaking document",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "ministry_approval_letter",
    number: 8,
    label: "Ministry Approval Letter",
    description: "Approval letter issued by the Ministry",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "proficiency_certificate",
    number: 9,
    label: "Proficiency Certificate",
    description: "Japanese language proficiency certificate (e.g., JLPT / NAT / JFT)",
    multiple: false,
    requiresTitle: false,
  },
  {
    key: "educational_certificates",
    number: 10,
    label: "Educational Certificates",
    description: "Upload multiple academic certificates (SSC, HSC, Degree, etc.) with custom titles",
    multiple: true,
    requiresTitle: true,
  },
  {
    key: "skill_test_certificate",
    number: 11,
    label: "Skill Test Certificate",
    description: "Specific skill evaluation / trade test pass certificate",
    multiple: false,
    requiresTitle: false,
  },
];

export interface PaymentInstallment {
  id?: number;
  amount: number;
  payment_date: string;
  note?: string;
}

export interface StudentAttachment {
  id: number;
  student_id: number;
  attachment_type: string;
  title: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface StudentRecord {
  id: number;
  applicant_name: string;
  photo_path: string | null;
  job_category: JobProgramType;
  job_trade: string;
  job_sub_category: string | null;
  gender: string;
  company_name: string;
  supervising_organization: string;
  total_amount: number;
  payment_received: number;
  payment_due: number;
  bd_phone: string;
  jp_phone: string;
  email: string;
  whatsapp: string;
  facebook: string;
  status: string;
  is_draft: boolean | number;
  created_at: string;
  updated_at: string;
  payments?: PaymentInstallment[];
  attachments?: StudentAttachment[];
  attachment_count?: number;
}

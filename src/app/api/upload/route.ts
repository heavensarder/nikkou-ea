import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  deleteStoredFileByUrl,
  ensureUploadFolder,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  UploadFolder,
} from "@/lib/storage";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderRaw = (formData.get("folder") as string) || "attachments";
    const customNameRaw = ((formData.get("custom_name") as string) || "").trim();
    const folder: UploadFolder =
      folderRaw === "photos" ? "photos" : "attachments";

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    // Strict 5 MB limit enforcement
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `File "${file.name}" (${sizeMb} MB) exceeds the maximum allowed size of ${MAX_FILE_SIZE_LABEL}.`,
        },
        { status: 413 }
      );
    }

    const originalName = file.name || "document";
    const ext = path.extname(originalName).toLowerCase() || ".bin";
    const displayFileName = customNameRaw
      ? customNameRaw.toLowerCase().endsWith(ext)
        ? customNameRaw
        : `${customNameRaw}${ext}`
      : originalName;

    if (folder === "photos" && !/\.(jpg|jpeg|png|webp|gif)$/i.test(ext)) {
      return NextResponse.json(
        {
          error:
            "Applicant photo must be a valid image file (JPG, JPEG, PNG, WEBP, GIF).",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file format (${ext}). Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX.`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Safe ASCII filename for Ubuntu Linux / Windows filesystem
    const baseName = path
      .basename(displayFileName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 70);

    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const storedFileName = `${baseName || "file"}-${uniqueSuffix}${ext}`;

    const uploadDir = await ensureUploadFolder(folder);
    const destPath = path.join(uploadDir, storedFileName);

    await fs.writeFile(destPath, buffer, { mode: 0o644 });

    const filePathUrl = `/api/files/${folder}/${storedFileName}`;

    return NextResponse.json({
      success: true,
      file: {
        file_name: displayFileName,
        file_path: filePathUrl,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to save file to server storage. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const filePath = body.file_path as string | undefined;
    if (filePath) {
      await deleteStoredFileByUrl(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    return NextResponse.json(
      { error: "Failed to remove file from server storage" },
      { status: 500 }
    );
  }
}

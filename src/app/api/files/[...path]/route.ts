import { NextRequest, NextResponse } from "next/server";
import { resolveStoredFilePath, UploadFolder } from "@/lib/storage";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const folder = pathSegments[0] as UploadFolder;
    const fileName = pathSegments.slice(1).join("/");

    if (
      (folder !== "photos" && folder !== "attachments") ||
      fileName.includes("..") ||
      fileName.includes("/") ||
      fileName.includes("\\")
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const fullPath = resolveStoredFilePath(folder, fileName);
    if (!fullPath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(fullPath);

    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    const url = new URL(req.url);
    const isDownload = url.searchParams.get("download") === "1";
    const customName = url.searchParams.get("name") || fileName;
    const safeAsciiName = customName.replace(/["\\\r\n]/g, "_");

    const disposition = isDownload
      ? `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(
          customName
        )}`
      : `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(
          customName
        )}`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("File serve error:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

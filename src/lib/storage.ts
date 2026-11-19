import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_SIZE_LABEL = "5 MB";

export type UploadFolder = "photos" | "attachments";

/**
 * Resolves the base upload storage directory on the server.
 * On an Ubuntu VPS, you can optionally set UPLOAD_STORAGE_DIR=/var/nikkou-ea/uploads
 * or leave it unset to use <project_root>/storage/uploads automatically.
 */
export function getStorageRoot(): string {
  const customDir = process.env.UPLOAD_STORAGE_DIR?.trim();
  if (customDir) {
    // If a Linux path like /srv/... or /var/... is configured while testing on Windows,
    // use local ./storage/uploads on Windows and the exact Linux path on Ubuntu VPS.
    if (
      process.platform === "win32" &&
      (customDir.startsWith("/srv/") ||
        customDir.startsWith("/var/") ||
        customDir.startsWith("/home/") ||
        customDir.startsWith("/opt/"))
    ) {
      return path.resolve(process.cwd(), "storage", "uploads");
    }
    return path.resolve(customDir);
  }
  return path.resolve(process.cwd(), "storage", "uploads");
}

/**
 * Legacy path fallback (<project_root>/public/uploads) so previously uploaded files continue to resolve.
 */
export function getLegacyStorageRoot(): string {
  return path.resolve(process.cwd(), "public", "uploads");
}

export async function ensureUploadFolder(folder: UploadFolder): Promise<string> {
  const dir = path.join(getStorageRoot(), folder);
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });
  return dir;
}

/**
 * Resolves an existing file from either the primary server storage directory
 * or the legacy public/uploads directory.
 */
export function resolveStoredFilePath(
  folder: UploadFolder,
  fileName: string
): string | null {
  const safeName = path.basename(fileName);
  const primaryPath = path.join(getStorageRoot(), folder, safeName);
  if (existsSync(primaryPath)) {
    return primaryPath;
  }

  const legacyPath = path.join(getLegacyStorageRoot(), folder, safeName);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  return null;
}

/**
 * Deletes a physical file from server storage given its /api/files/<folder>/<name> URL.
 */
export async function deleteStoredFileByUrl(
  fileUrl: string | null | undefined
): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith("/api/files/")) return;
  const rel = fileUrl.replace("/api/files/", "").split("?")[0];
  const segments = rel.split("/").filter(Boolean);
  if (segments.length < 2) return;

  const folder = segments[0] as UploadFolder;
  if (folder !== "photos" && folder !== "attachments") return;

  const fileName = segments.slice(1).join("/");
  const resolved = resolveStoredFilePath(folder, fileName);
  if (resolved) {
    try {
      await fs.unlink(resolved);
    } catch {
      // Ignore if file was already deleted
    }
  }
}

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_SIZE_LABEL = "5 MB";

export type UploadFolder = "photos" | "attachments";

/**
 * Uses <project_root>/public/uploads directly on both local PC and Ubuntu VPS.
 */
export function getStorageRoot(): string {
  return path.resolve(process.cwd(), "public", "uploads");
}

export async function ensureUploadFolder(folder: UploadFolder): Promise<string> {
  const dir = path.join(getStorageRoot(), folder);
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });
  return dir;
}

export function resolveStoredFilePath(
  folder: UploadFolder,
  fileName: string
): string | null {
  const safeName = path.basename(fileName);
  const fullPath = path.join(getStorageRoot(), folder, safeName);
  if (existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

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

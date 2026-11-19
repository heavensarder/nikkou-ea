import { NextRequest, NextResponse } from "next/server";
import { getPool, ensureDatabaseInitialized } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { deleteStoredFileByUrl } from "@/lib/storage";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabaseInitialized();
    const pool = getPool();
    const { id } = await context.params;
    const attachmentId = Number(id);

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Invalid attachment ID" },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM student_attachments WHERE id = ?",
      [attachmentId]
    );

    if (rows.length > 0) {
      const att = rows[0];
      await pool.query("DELETE FROM student_attachments WHERE id = ?", [
        attachmentId,
      ]);
      await deleteStoredFileByUrl(att.file_path);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/attachments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

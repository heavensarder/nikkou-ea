import { NextRequest, NextResponse } from "next/server";
import { getPool, ensureDatabaseInitialized } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { deleteStoredFileByUrl } from "@/lib/storage";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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
    const studentId = Number(id);

    if (!studentId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM students WHERE id = ?",
      [studentId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const student = rows[0];

    const [payments] = await pool.query<RowDataPacket[]>(
      "SELECT id, amount, DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date, note FROM student_payments WHERE student_id = ? ORDER BY payment_date ASC, id ASC",
      [studentId]
    );

    const [attachments] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM student_attachments WHERE student_id = ? ORDER BY id ASC",
      [studentId]
    );

    return NextResponse.json({
      student: {
        ...student,
        payments,
        attachments,
      },
    });
  } catch (error) {
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to load student details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
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
    const studentId = Number(id);

    if (!studentId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const body = await req.json();
    const isDraft = body.is_draft ? 1 : 0;
    const applicantName = (body.applicant_name || "").trim();

    if (!isDraft && !applicantName) {
      return NextResponse.json(
        { error: "Applicant Name is required to publish a student record." },
        { status: 400 }
      );
    }

    const totalAmount = Number(body.total_amount) || 0;
    const payments: Array<{ amount: number; payment_date: string; note?: string }> =
      Array.isArray(body.payments) ? body.payments : [];

    const validPayments = payments.filter(
      (p) => Number(p.amount) > 0 && p.payment_date
    );
    const totalReceived = validPayments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const paymentDue = totalAmount - totalReceived;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check existing photo and attachments before update so removed files are deleted from disk
      const [oldStudentRows] = await conn.query<RowDataPacket[]>(
        "SELECT photo_path FROM students WHERE id = ?",
        [studentId]
      );
      const oldPhotoPath: string | null = oldStudentRows[0]?.photo_path || null;

      const [oldAttRows] = await conn.query<RowDataPacket[]>(
        "SELECT file_path FROM student_attachments WHERE student_id = ?",
        [studentId]
      );
      const oldAttPaths = oldAttRows
        .map((r) => r.file_path as string)
        .filter(Boolean);

      await conn.query(
        `UPDATE students SET
          applicant_name = ?,
          photo_path = ?,
          job_category = ?,
          job_trade = ?,
          job_sub_category = ?,
          gender = ?,
          company_name = ?,
          supervising_organization = ?,
          total_amount = ?,
          payment_received = ?,
          payment_due = ?,
          bd_phone = ?,
          jp_phone = ?,
          email = ?,
          whatsapp = ?,
          facebook = ?,
          status = ?,
          is_draft = ?
        WHERE id = ?`,
        [
          applicantName || "Untitled Draft Student",
          body.photo_path || null,
          body.job_category || "TITP/ESD",
          body.job_trade || "Agriculture",
          body.job_sub_category || null,
          body.gender || "Male",
          (body.company_name || "").trim(),
          (body.supervising_organization || "").trim(),
          totalAmount,
          totalReceived,
          paymentDue,
          (body.bd_phone || "").trim(),
          (body.jp_phone || "").trim(),
          (body.email || "").trim(),
          (body.whatsapp || "").trim(),
          (body.facebook || "").trim(),
          body.status || "In Process",
          isDraft,
          studentId,
        ]
      );

      // Replace payment installments
      const trimmedCompany = (body.company_name || "").trim();
      const trimmedSupervising = (body.supervising_organization || "").trim();
      if (trimmedCompany) {
        await conn.query(
          "INSERT INTO saved_organizations (org_type, name, is_deleted) VALUES ('company', ?, 0) ON DUPLICATE KEY UPDATE is_deleted = 0",
          [trimmedCompany]
        );
      }
      if (trimmedSupervising) {
        await conn.query(
          "INSERT INTO saved_organizations (org_type, name, is_deleted) VALUES ('supervising', ?, 0) ON DUPLICATE KEY UPDATE is_deleted = 0",
          [trimmedSupervising]
        );
      }
      await conn.query("DELETE FROM student_payments WHERE student_id = ?", [
        studentId,
      ]);
      for (const payment of validPayments) {
        await conn.query(
          `INSERT INTO student_payments (student_id, amount, payment_date, note)
           VALUES (?, ?, ?, ?)`,
          [
            studentId,
            Number(payment.amount) || 0,
            payment.payment_date,
            payment.note || null,
          ]
        );
      }

      // Synchronize attachments if provided
      const newAttPathSet = new Set<string>();
      if (Array.isArray(body.attachments)) {
        await conn.query("DELETE FROM student_attachments WHERE student_id = ?", [
          studentId,
        ]);
        for (const att of body.attachments) {
          if (!att.file_path || !att.attachment_type) continue;
          newAttPathSet.add(att.file_path);
          await conn.query(
            `INSERT INTO student_attachments (
              student_id,
              attachment_type,
              title,
              file_name,
              file_path,
              mime_type,
              file_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              studentId,
              att.attachment_type,
              att.title ? att.title.trim() : null,
              att.file_name || "Document",
              att.file_path,
              att.mime_type || "application/octet-stream",
              Number(att.file_size) || 0,
            ]
          );
        }
      }

      await conn.commit();

      // Physical file cleanup on server disk for removed/replaced photo or attachments
      if (oldPhotoPath && oldPhotoPath !== (body.photo_path || null)) {
        await deleteStoredFileByUrl(oldPhotoPath);
      }
      if (Array.isArray(body.attachments)) {
        for (const oldPath of oldAttPaths) {
          if (!newAttPathSet.has(oldPath)) {
            await deleteStoredFileByUrl(oldPath);
          }
        }
      }

      return NextResponse.json({
        success: true,
        id: studentId,
        message: isDraft
          ? "Draft updated successfully."
          : "Student record updated successfully.",
      });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("PUT /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update student record" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
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
    const studentId = Number(id);
    const body = await req.json();

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (typeof body.status === "string") {
      updates.push("status = ?");
      values.push(body.status);
    }
    if (typeof body.is_draft !== "undefined") {
      updates.push("is_draft = ?");
      values.push(body.is_draft ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(studentId);
    await pool.query(
      `UPDATE students SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to patch student record" },
      { status: 500 }
    );
  }
}

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
    const studentId = Number(id);

    const [studentRows] = await pool.query<RowDataPacket[]>(
      "SELECT photo_path FROM students WHERE id = ?",
      [studentId]
    );
    const [attRows] = await pool.query<RowDataPacket[]>(
      "SELECT file_path FROM student_attachments WHERE student_id = ?",
      [studentId]
    );

    await pool.query("DELETE FROM students WHERE id = ?", [studentId]);

    if (studentRows[0]?.photo_path) {
      await deleteStoredFileByUrl(studentRows[0].photo_path);
    }
    for (const att of attRows) {
      await deleteStoredFileByUrl(att.file_path);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete student record" },
      { status: 500 }
    );
  }
}

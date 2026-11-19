import { NextRequest, NextResponse } from "next/server";
import { getPool, ensureDatabaseInitialized } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabaseInitialized();
    const pool = getPool();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const jobCategory = searchParams.get("job_category") || "";
    const status = searchParams.get("status") || "";
    const draftFilter = searchParams.get("draft") || "all"; // 'all' | 'published' | 'draft'

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(
        "(s.applicant_name LIKE ? OR s.company_name LIKE ? OR s.supervising_organization LIKE ? OR s.bd_phone LIKE ? OR s.jp_phone LIKE ? OR s.email LIKE ?)"
      );
      const q = `%${search}%`;
      values.push(q, q, q, q, q, q);
    }

    if (jobCategory) {
      conditions.push("s.job_category = ?");
      values.push(jobCategory);
    }

    if (status) {
      conditions.push("s.status = ?");
      values.push(status);
    }

    if (draftFilter === "published") {
      conditions.push("s.is_draft = 0");
    } else if (draftFilter === "draft") {
      conditions.push("s.is_draft = 1");
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        (SELECT COUNT(*) FROM student_attachments a WHERE a.student_id = s.id) AS attachment_count,
        (SELECT COUNT(*) FROM student_payments p WHERE p.student_id = s.id) AS payment_count
      FROM students s
      ${whereClause}
      ORDER BY s.updated_at DESC, s.id DESC`,
      values
    );

    // Fetch overall stats for dashboard
    const [statsRows] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN is_draft = 0 THEN 1 ELSE 0 END) AS active_students,
        SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) AS draft_students,
        SUM(CASE WHEN status = 'In Japan' AND is_draft = 0 THEN 1 ELSE 0 END) AS in_japan_count,
        SUM(CASE WHEN status = 'In Process' AND is_draft = 0 THEN 1 ELSE 0 END) AS in_process_count,
        SUM(CASE WHEN job_category = 'TITP/ESD' AND is_draft = 0 THEN 1 ELSE 0 END) AS titp_count,
        SUM(CASE WHEN job_category = 'SSW' AND is_draft = 0 THEN 1 ELSE 0 END) AS ssw_count,
        COALESCE(SUM(CASE WHEN is_draft = 0 THEN total_amount ELSE 0 END), 0) AS total_receivable,
        COALESCE(SUM(CASE WHEN is_draft = 0 THEN payment_received ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN is_draft = 0 THEN payment_due ELSE 0 END), 0) AS total_due
      FROM students
    `);

    return NextResponse.json({
      students: rows,
      stats: statsRows[0] || {
        total_records: 0,
        active_students: 0,
        draft_students: 0,
        in_japan_count: 0,
        in_process_count: 0,
        titp_count: 0,
        ssw_count: 0,
        total_receivable: 0,
        total_received: 0,
        total_due: 0,
      },
    });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabaseInitialized();
    const pool = getPool();
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

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO students (
          applicant_name,
          photo_path,
          job_category,
          job_trade,
          job_sub_category,
          gender,
          company_name,
          supervising_organization,
          total_amount,
          payment_received,
          payment_due,
          bd_phone,
          jp_phone,
          email,
          whatsapp,
          facebook,
          status,
          is_draft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ]
      );

      const studentId = result.insertId;

      const trimmedCompany = (body.company_name || "").trim();
      const trimmedSupervising = (body.supervising_organization || "").trim();
      if (trimmedCompany) {
        await conn.query(
          "INSERT IGNORE INTO saved_organizations (org_type, name) VALUES ('company', ?)",
          [trimmedCompany]
        );
      }
      if (trimmedSupervising) {
        await conn.query(
          "INSERT IGNORE INTO saved_organizations (org_type, name) VALUES ('supervising', ?)",
          [trimmedSupervising]
        );
      }

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

      const attachments: Array<{
        attachment_type: string;
        title?: string | null;
        file_name: string;
        file_path: string;
        mime_type?: string;
        file_size?: number;
      }> = Array.isArray(body.attachments) ? body.attachments : [];

      for (const att of attachments) {
        if (!att.file_path || !att.attachment_type) continue;
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

      await conn.commit();

      return NextResponse.json({
        success: true,
        id: studentId,
        message: isDraft
          ? "Student record saved as draft."
          : "Student record created successfully.",
      });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("POST /api/students error:", error);
    return NextResponse.json(
      { error: "Failed to create student record" },
      { status: 500 }
    );
  }
}

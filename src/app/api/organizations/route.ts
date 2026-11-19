import { NextRequest, NextResponse } from "next/server";
import { getPool, ensureDatabaseInitialized } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSavedOrgsTable() {
  await ensureDatabaseInitialized();
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_organizations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      org_type ENUM('company', 'supervising') NOT NULL,
      name VARCHAR(255) NOT NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_org_type_name (org_type, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure is_deleted column exists if table was created earlier without it
  try {
    await pool.query(
      "ALTER TABLE saved_organizations ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0"
    );
  } catch {
    // Column already exists
  }

  return pool;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await ensureSavedOrgsTable();

    const [companyRows] = await pool.query<RowDataPacket[]>(`
      SELECT DISTINCT name FROM (
        SELECT TRIM(company_name) AS name FROM students WHERE TRIM(company_name) != ''
        UNION
        SELECT TRIM(name) AS name FROM saved_organizations WHERE org_type = 'company' AND is_deleted = 0 AND TRIM(name) != ''
      ) AS combined
      WHERE name NOT IN (
        SELECT TRIM(name) FROM saved_organizations WHERE org_type = 'company' AND is_deleted = 1
      )
      ORDER BY name ASC
    `);

    const [supervisingRows] = await pool.query<RowDataPacket[]>(`
      SELECT DISTINCT name FROM (
        SELECT TRIM(supervising_organization) AS name FROM students WHERE TRIM(supervising_organization) != ''
        UNION
        SELECT TRIM(name) AS name FROM saved_organizations WHERE org_type = 'supervising' AND is_deleted = 0 AND TRIM(name) != ''
      ) AS combined
      WHERE name NOT IN (
        SELECT TRIM(name) FROM saved_organizations WHERE org_type = 'supervising' AND is_deleted = 1
      )
      ORDER BY name ASC
    `);

    return NextResponse.json({
      companies: companyRows.map((r) => r.name).filter(Boolean),
      supervisingOrganizations: supervisingRows
        .map((r) => r.name)
        .filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/organizations error:", error);
    return NextResponse.json(
      { companies: [], supervisingOrganizations: [] },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await ensureSavedOrgsTable();
    const body = await req.json();

    const companyName = (body.company_name || "").trim();
    const supervisingOrg = (body.supervising_organization || "").trim();

    if (companyName) {
      await pool.query(
        `INSERT INTO saved_organizations (org_type, name, is_deleted)
         VALUES ('company', ?, 0)
         ON DUPLICATE KEY UPDATE is_deleted = 0`,
        [companyName]
      );
    }

    if (supervisingOrg) {
      await pool.query(
        `INSERT INTO saved_organizations (org_type, name, is_deleted)
         VALUES ('supervising', ?, 0)
         ON DUPLICATE KEY UPDATE is_deleted = 0`,
        [supervisingOrg]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/organizations error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await ensureSavedOrgsTable();
    const body = await req.json();
    const orgType = body.org_type === "supervising" ? "supervising" : "company";
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    await pool.query(
      `INSERT INTO saved_organizations (org_type, name, is_deleted)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE is_deleted = 1`,
      [orgType, name]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/organizations error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

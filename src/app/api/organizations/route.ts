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
      address VARCHAR(500) NOT NULL DEFAULT '',
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_org_type_name (org_type, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await pool.query(
      "ALTER TABLE students ADD COLUMN company_address VARCHAR(500) NOT NULL DEFAULT '' AFTER company_name"
    );
  } catch {
    // Column already exists
  }

  try {
    await pool.query(
      "ALTER TABLE saved_organizations ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0"
    );
  } catch {
    // Column already exists
  }

  try {
    await pool.query(
      "ALTER TABLE saved_organizations ADD COLUMN address VARCHAR(500) NOT NULL DEFAULT '' AFTER name"
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

    // Build company -> address map from both students and saved_organizations
    const companyAddresses: Record<string, string> = {};

    const [studentAddrRows] = await pool.query<RowDataPacket[]>(`
      SELECT TRIM(company_name) AS name, TRIM(company_address) AS address
      FROM students
      WHERE TRIM(company_name) != '' AND TRIM(company_address) != ''
      ORDER BY id ASC
    `);
    for (const row of studentAddrRows) {
      if (row.name && row.address) {
        companyAddresses[row.name] = row.address;
      }
    }

    const [savedAddrRows] = await pool.query<RowDataPacket[]>(`
      SELECT TRIM(name) AS name, TRIM(address) AS address
      FROM saved_organizations
      WHERE org_type = 'company' AND is_deleted = 0 AND TRIM(name) != '' AND TRIM(address) != ''
    `);
    for (const row of savedAddrRows) {
      if (row.name && row.address) {
        companyAddresses[row.name] = row.address;
      }
    }

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
      companyAddresses,
      supervisingOrganizations: supervisingRows
        .map((r) => r.name)
        .filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/organizations error:", error);
    return NextResponse.json(
      { companies: [], companyAddresses: {}, supervisingOrganizations: [] },
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
    const companyAddress = (body.company_address || "").trim();
    const supervisingOrg = (body.supervising_organization || "").trim();

    if (companyName) {
      if (companyAddress) {
        await pool.query(
          `INSERT INTO saved_organizations (org_type, name, address, is_deleted)
           VALUES ('company', ?, ?, 0)
           ON DUPLICATE KEY UPDATE address = VALUES(address), is_deleted = 0`,
          [companyName, companyAddress]
        );
      } else {
        await pool.query(
          `INSERT INTO saved_organizations (org_type, name, is_deleted)
           VALUES ('company', ?, 0)
           ON DUPLICATE KEY UPDATE is_deleted = 0`,
          [companyName]
        );
      }
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

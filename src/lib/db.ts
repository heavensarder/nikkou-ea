import mysql from "mysql2/promise";

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nikkou-ea",
};

const CURRENT_SCHEMA_VERSION = 4;

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var _dbSchemaVersion: number | undefined;
}

export function getPool(): mysql.Pool {
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
    });
  }
  return global._mysqlPool;
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (global._dbSchemaVersion === CURRENT_SCHEMA_VERSION) return;

  try {
    // First ensure database exists
    const rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();
  } catch (err) {
    // Proceed to pool creation if database already exists
    console.warn("Root DB check notice:", err);
  }

  const pool = getPool();

  // Create students table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicant_name VARCHAR(255) NOT NULL DEFAULT '',
      photo_path VARCHAR(500) NULL,
      job_category VARCHAR(50) NOT NULL DEFAULT 'TITP/ESD',
      job_trade VARCHAR(100) NOT NULL DEFAULT 'Agriculture',
      job_sub_category VARCHAR(100) NULL,
      gender VARCHAR(30) NOT NULL DEFAULT 'Male',
      company_name VARCHAR(255) NOT NULL DEFAULT '',
      company_address VARCHAR(500) NOT NULL DEFAULT '',
      supervising_organization VARCHAR(255) NOT NULL DEFAULT '',
      total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      payment_received DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      payment_due DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      bd_phone VARCHAR(60) NOT NULL DEFAULT '',
      jp_phone VARCHAR(60) NOT NULL DEFAULT '',
      email VARCHAR(180) NOT NULL DEFAULT '',
      whatsapp VARCHAR(80) NOT NULL DEFAULT '',
      facebook VARCHAR(255) NOT NULL DEFAULT '',
      status VARCHAR(60) NOT NULL DEFAULT 'In Process',
      is_draft TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure company_address column exists on existing students table
  try {
    await pool.query(
      "ALTER TABLE students ADD COLUMN company_address VARCHAR(500) NOT NULL DEFAULT '' AFTER company_name"
    );
  } catch {
    // Column already exists
  }

  // Create student_payments table (multiple payment installments with date)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      payment_date DATE NOT NULL,
      note VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payment_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create student_attachments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      attachment_type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
      file_size BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_attachment_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Create saved_organizations table for auto-saved Company Names and Supervising Organizations
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

  global._dbSchemaVersion = CURRENT_SCHEMA_VERSION;
}

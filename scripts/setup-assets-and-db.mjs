import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";

const LOGO_URL = "https://i.postimg.cc/7Pdx3FCD/nikkou-logo.png";
const FAVICON_URL = "https://i.postimg.cc/ZYwdBC75/Nikkou-logo.png";

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    console.log(`Downloaded ${url} -> ${destPath}`);
  } catch (err) {
    console.warn(`Could not download ${url}:`, err.message);
  }
}

async function initDb() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
  });

  await conn.query(
    "CREATE DATABASE IF NOT EXISTS `nikkou-ea` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  );
  await conn.query("USE `nikkou-ea`;");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicant_name VARCHAR(255) NOT NULL DEFAULT '',
      photo_path VARCHAR(500) NULL,
      job_category VARCHAR(50) NOT NULL DEFAULT 'TITP/ESD',
      job_trade VARCHAR(100) NOT NULL DEFAULT 'Agriculture',
      job_sub_category VARCHAR(100) NULL,
      gender VARCHAR(30) NOT NULL DEFAULT 'Male',
      company_name VARCHAR(255) NOT NULL DEFAULT '',
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

  await conn.query(`
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

  await conn.query(`
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

  await conn.end();
  console.log("MySQL database 'nikkou-ea' and tables initialized successfully.");
}

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  await downloadFile(LOGO_URL, path.join(publicDir, "nikkou-logo.png"));
  await downloadFile(FAVICON_URL, path.join(publicDir, "favicon.png"));
  await initDb();
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});

import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

const url = process.env.TURSO_DATABASE_URL || 'file:pkkmb_mentor.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log(`Connecting to Turso Database: ${url}`);

const db = createClient({ url, authToken });

const unmaMentorsList = [
  { npm: '2301101002', nama: 'NABIEL BAYU SATRYA RAMADHAN', prodi: 'Mentor PKKMB' },
  { npm: '2301101037', nama: 'MUHAMAD GUNTUR ALFAREZZI', prodi: 'Mentor PKKMB' },
  { npm: '2301101052', nama: 'ALFAT ILAFATUHSHARA', prodi: 'Mentor PKKMB' },
  { npm: '2304101024', nama: 'SYAHRUL DWI TEGUH NUROHIM', prodi: 'Mentor PKKMB' },
  { npm: '2305101028', nama: 'DIPA FADILAN', prodi: 'Mentor PKKMB' },
  { npm: '2305101094', nama: 'RAFLI AULIA', prodi: 'Mentor PKKMB' },
  { npm: '2305101119', nama: "SEAN RA'UF AL-FARIZIE", prodi: 'Mentor PKKMB' },
  { npm: '2305101136', nama: 'ACHMAD SYAYIDUL IKHROM', prodi: 'Mentor PKKMB' },
  { npm: '2306101036', nama: 'SRI NURAENI', prodi: 'Mentor PKKMB' },
  { npm: '2307101019', nama: 'NAJIB MUHASYIN', prodi: 'Mentor PKKMB' },
  { npm: '2308101003', nama: 'AFIFAH NURAENI', prodi: 'Mentor PKKMB' },
  { npm: '2310101004', nama: 'AYANG WIDIANINGSIH', prodi: 'Mentor PKKMB' },
  { npm: '2310101006', nama: 'SYAHRIL HILMAN ALFARIZ', prodi: 'Mentor PKKMB' },
  { npm: '2314101048', nama: 'ROBBI ILHAM M', prodi: 'Mentor PKKMB' },
  { npm: '2316101023', nama: 'N SUKMA ALKINDI', prodi: 'Mentor PKKMB' },
  { npm: '2318101044', nama: 'HAFIZH LAZUARDI DARMAWAN', prodi: 'Mentor PKKMB' },
  { npm: '2321101070', nama: 'FADHIL DWI SURYA', prodi: 'Mentor PKKMB' },
  { npm: '2322101009', nama: 'FAIZ FATHULMILLAH', prodi: 'Mentor PKKMB' },
  { npm: '2322101016', nama: 'SITI NUR ANISSA', prodi: 'Mentor PKKMB' },
  { npm: '2324101005', nama: 'MUHAMAD FIDIYANDI', prodi: 'Mentor PKKMB' },
  { npm: '2324101011', nama: 'GUGUN GUNAWAN', prodi: 'Mentor PKKMB' },
  { npm: '2404101035', nama: 'MUHAMAD ARIFIN', prodi: 'Mentor PKKMB' },
  { npm: '2410101007', nama: 'IZKA AGASTIAR', prodi: 'Mentor PKKMB' },
  { npm: '2410101019', nama: 'NAILATUL IZZAH NAPISAH', prodi: 'Mentor PKKMB' },
  { npm: '2411101002', nama: 'INTAN NUR AFIAH', prodi: 'Mentor PKKMB' },
  { npm: '2414101091', nama: 'MUHAMAD HAISYAM KHAIRIZMI', prodi: 'Mentor PKKMB' },
  { npm: '2521101048', nama: 'GIAR FERDIAWAN', prodi: 'Mentor PKKMB' },
  { npm: '2422101135', nama: 'SALSABILA KHAIRUNISA', prodi: 'Mentor PKKMB' },
  { npm: '2422101205', nama: 'IRPAN NURHAQIQI', prodi: 'Mentor PKKMB' },
  { npm: '2521101038', nama: 'FARAH ADIBA', prodi: 'Mentor PKKMB' },
];

async function seed() {
  console.log('Creating tables...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS students (
      npm TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      prodi TEXT NOT NULL,
      is_registered INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_kelompok TEXT NOT NULL UNIQUE,
      deskripsi TEXT,
      status TEXT DEFAULT 'available'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npm TEXT UNIQUE NOT NULL,
      group_id INTEGER UNIQUE NOT NULL,
      no_wa TEXT NOT NULL,
      ukuran_baju TEXT DEFAULT '-',
      registered_at TEXT,
      FOREIGN KEY (npm) REFERENCES students(npm),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );
  `);

  console.log('Seeding 30 Groups...');
  const groupStatements = Array.from({ length: 30 }, (_, i) => ({
    sql: 'INSERT OR IGNORE INTO groups (id, nama_kelompok, deskripsi, status) VALUES (?, ?, ?, ?)',
    args: [
      i + 1,
      `Kelompok ${String(i + 1).padStart(2, '0')}`,
      `Kelompok PKKMB UNMA ${String(i + 1).padStart(2, '0')}`,
      'available',
    ],
  }));
  await db.batch(groupStatements, 'write');

  console.log('Seeding 30 Official UNMA Mentors...');
  const studentStatements = unmaMentorsList.map((s) => ({
    sql: 'INSERT INTO students (npm, nama, prodi, is_registered) VALUES (?, ?, ?, 0) ON CONFLICT(npm) DO UPDATE SET nama = excluded.nama',
    args: [s.npm, s.nama.toUpperCase(), s.prodi],
  }));
  await db.batch(studentStatements, 'write');

  console.log('Seeding registration for MUHAMAD HAISYAM KHAIRIZMI (2414101091) - Kelompok 02 - Baju L...');
  const haisyamNpm = '2414101091';
  const haisyamNama = 'MUHAMAD HAISYAM KHAIRIZMI';
  const haisyamUkuran = 'L';
  const targetGroupId = 2; // Kelompok 02
  const jakartaTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });

  // Reset Kelompok 14 back to available
  await db.execute("UPDATE groups SET status = 'available' WHERE id = 14");
  await db.execute({
    sql: 'DELETE FROM registrations WHERE group_id = 14 AND npm != ?',
    args: [haisyamNpm],
  });

  await db.batch(
    [
      {
        sql: 'UPDATE students SET nama = ?, is_registered = 1 WHERE npm = ?',
        args: [haisyamNama, haisyamNpm],
      },
      {
        sql: "UPDATE groups SET status = 'taken' WHERE id = ?",
        args: [targetGroupId],
      },
      {
        sql: 'INSERT INTO registrations (npm, group_id, no_wa, ukuran_baju, registered_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(npm) DO UPDATE SET group_id = excluded.group_id, ukuran_baju = excluded.ukuran_baju',
        args: [haisyamNpm, targetGroupId, '-', haisyamUkuran, jakartaTime],
      },
    ],
    'write'
  );

  console.log('✅ Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

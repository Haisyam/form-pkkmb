import { createClient, Client } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:pkkmb_mentor.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db: Client = createClient({
  url,
  authToken,
});

export function getJakartaTimestamp(): string {
  const timeZone = process.env.TIME || process.env.TZ || 'Asia/Jakarta';
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return new Intl.DateTimeFormat('sv-SE', options).format(now);
}

export interface TimeStatus {
  isClosed: boolean;
  currentTimeWib: string;
  deadlineText: string;
}

export function checkRegistrationDeadline(): TimeStatus {
  const timeZone = process.env.TIME || process.env.TZ || 'Asia/Jakarta';
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const [hourStr, minuteStr, secondStr] = timeFormatter.format(now).split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const deadlineHour = parseInt(process.env.DEADLINE_HOUR || '10', 10);
  const deadlineMinute = parseInt(process.env.DEADLINE_MINUTE || '0', 10);

  const isClosed = hour > deadlineHour || (hour === deadlineHour && minute >= deadlineMinute);

  return {
    isClosed,
    currentTimeWib: `${hourStr}:${minuteStr}:${secondStr} WIB`,
    deadlineText: `${String(deadlineHour).padStart(2, '0')}.${String(deadlineMinute).padStart(2, '0')} WIB`,
  };
}

// List of 30 official mentor candidates (Data Terbaru 2026/2027)
export const unmaMentorsList = [
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

let isInitialized = false;

export async function ensureDbInitialized() {
  if (isInitialized) return;
  try {
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

    try {
      await db.execute("ALTER TABLE registrations ADD COLUMN ukuran_baju TEXT DEFAULT '-'");
    } catch (e) {
      // Column already exists
    }

    const groupCountRes = await db.execute('SELECT COUNT(*) as count FROM groups');
    const count = Number(groupCountRes.rows[0]?.count || 0);

    if (count < 30) {
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
    }

    // Sync students using UPSERT so new names & NPMs update automatically
    const studentStatements = unmaMentorsList.map((s) => ({
      sql: 'INSERT INTO students (npm, nama, prodi, is_registered) VALUES (?, ?, ?, 0) ON CONFLICT(npm) DO UPDATE SET nama = excluded.nama',
      args: [s.npm, s.nama.toUpperCase(), s.prodi],
    }));
    await db.batch(studentStatements, 'write');

    // Auto-seed registration ONLY IF NOT ALREADY TAKEN for MUHAMAD HAISYAM KHAIRIZMI (2414101091) - Kelompok 02 - Baju L
    const haisyamNpm = '2414101091';
    const haisyamNama = 'MUHAMAD HAISYAM KHAIRIZMI';
    const haisyamUkuran = 'L';
    const targetGroupId = 2; // Kelompok 02
    const jakartaTime = getJakartaTimestamp();

    await db.batch(
      [
        {
          sql: 'UPDATE students SET nama = ?, is_registered = 1 WHERE npm = ?',
          args: [haisyamNama, haisyamNpm],
        },
        {
          sql: "UPDATE groups SET status = 'taken' WHERE id = ? AND status = 'available'",
          args: [targetGroupId],
        },
        {
          sql: 'INSERT OR IGNORE INTO registrations (npm, group_id, no_wa, ukuran_baju, registered_at) VALUES (?, ?, ?, ?, ?)',
          args: [haisyamNpm, targetGroupId, '-', haisyamUkuran, jakartaTime],
        },
      ],
      'write'
    );

    // CRITICAL FIX: Dynamically sync is_registered flag with actual active registrations table
    // Ensures no mentor is ever locked in an orphaned state (is_registered = 1 without a registration row)
    await db.execute('UPDATE students SET is_registered = 0 WHERE npm NOT IN (SELECT npm FROM registrations)');
    await db.execute('UPDATE students SET is_registered = 1 WHERE npm IN (SELECT npm FROM registrations)');

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export default db;


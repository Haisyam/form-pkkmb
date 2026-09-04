import { createClient, Client } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:pkkmb_mentor.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const db: Client = createClient({
  url,
  authToken,
});

export function getJakartaTimestamp(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
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

// List of 30 official mentor candidates
export const unmaMentorsList = [
  // Ormawa Univ & UKM (16)
  { npm: '2322101009', nama: 'FAIZ FATHULMILLAH', prodi: 'Ormawa Univ & UKM' },
  { npm: '2301101002', nama: 'NABIEL BAYU SATRYA RAMADHAN', prodi: 'Ormawa Univ & UKM' },
  { npm: '2301101052', nama: 'ALFAT ILAFATUHSHARA', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101094', nama: 'RAFLI AULIA', prodi: 'Ormawa Univ & UKM' },
  { npm: '2421101031', nama: 'GIAR FERDIAWAN', prodi: 'Ormawa Univ & UKM' },
  { npm: '2304101024', nama: 'SYAHRUL DWI TEGUH NUROHIM', prodi: 'Ormawa Univ & UKM' },
  { npm: '2404101035', nama: 'MUHAMAD ARIFIN', prodi: 'Ormawa Univ & UKM' },
  { npm: '2310101006', nama: 'SYAHRIL HILMAN ALFARIZ', prodi: 'Ormawa Univ & UKM' },
  { npm: '2324101005', nama: 'MUHAMAD FIDIYANDI', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101136', nama: 'ACHMAD SYAYIDUL IKHROM', prodi: 'Ormawa Univ & UKM' },
  { npm: '2410101019', nama: 'NAILATUL IZZAH NAPISAH', prodi: 'Ormawa Univ & UKM' },
  { npm: '2422101135', nama: 'SALSABILA KH', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101028', nama: 'DIPA FADILAN', prodi: 'Ormawa Univ & UKM' },
  { npm: '2414101091', nama: 'MUHAMAD HAISYAM KHAIRIZMI', prodi: 'Ormawa Univ & UKM' },
  { npm: '2322101016', nama: 'SITI NUR ANISSA', prodi: 'Ormawa Univ & UKM' },
  { npm: '2411101002', nama: 'INTAN NUR AFIAH', prodi: 'Ormawa Univ & UKM' },

  // Ormawa Fakultas (14)
  { npm: '2410101007', nama: 'IZKA AGASTIAR', prodi: 'Ormawa Fakultas' },
  { npm: '2310101004', nama: 'AYANG WIDIANINGSIH', prodi: 'Ormawa Fakultas' },
  { npm: '2316101023', nama: 'N SUKMA ALKINDI', prodi: 'Ormawa Fakultas' },
  { npm: '2314101048', nama: 'ROBBI ILHAM M', prodi: 'Ormawa Fakultas' },
  { npm: '2306101036', nama: 'SRI NURAENI', prodi: 'Ormawa Fakultas' },
  { npm: '2305101119', nama: "SEAN RA'UF AL-FARIZIE", prodi: 'Ormawa Fakultas' },
  { npm: '2321101070', nama: 'FADHIL DWI SURYA', prodi: 'Ormawa Fakultas' },
  { npm: '2521101038', nama: 'FARAH ADIBA', prodi: 'Ormawa Fakultas' },
  { npm: '2307101019', nama: 'NAJIB MUHASYIN', prodi: 'Ormawa Fakultas' },
  { npm: '2308101003', nama: 'AFIFAH NURAENI', prodi: 'Ormawa Fakultas' },
  { npm: '2324101011', nama: 'GUGUN GUNAWAN', prodi: 'Ormawa Fakultas' },
  { npm: '2422101205', nama: 'IRPAN NURHAQIQI', prodi: 'Ormawa Fakultas' },
  { npm: '2301101037', nama: 'MUHAMAD GUNTUR', prodi: 'Ormawa Fakultas' },
  { npm: '2318101044', nama: 'HAFIZH LAZUARDI DARMAWAN', prodi: 'Ormawa Fakultas' },
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

    const studentStatements = unmaMentorsList.map((s) => ({
      sql: 'INSERT OR IGNORE INTO students (npm, nama, prodi, is_registered) VALUES (?, ?, ?, 0)',
      args: [s.npm, s.nama.toUpperCase(), s.prodi],
    }));
    await db.batch(studentStatements, 'write');

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export default db;


import Database from 'better-sqlite3';
import path from 'path';

let dbPath = path.join(process.cwd(), 'pkkmb_mentor.db');

if (process.env.VERCEL) {
  dbPath = path.join('/tmp', 'pkkmb_mentor.db');
}

// Global Singleton pattern to prevent re-initializing database on hot reloads
const globalForDb = global as unknown as { db: Database.Database };

const db = globalForDb.db || new Database(dbPath);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    npm TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    prodi TEXT NOT NULL,
    is_registered INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_kelompok TEXT NOT NULL UNIQUE,
    deskripsi TEXT,
    status TEXT DEFAULT 'available'
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npm TEXT UNIQUE NOT NULL,
    group_id INTEGER UNIQUE NOT NULL,
    no_wa TEXT NOT NULL,
    ukuran_baju TEXT DEFAULT '-',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (npm) REFERENCES students(npm),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );
`);

// Auto-add missing column if table already existed without ukuran_baju
try {
  db.exec("ALTER TABLE registrations ADD COLUMN ukuran_baju TEXT DEFAULT '-'");
} catch (e) {
  // column already exists
}

// List of 30 official mentor candidates (All Names UPPERCASE)
const unmaMentorsList = [
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

function seedDatabase() {
  // Ensure 30 groups exist
  const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
  if (groupCount.count < 30) {
    db.prepare('DELETE FROM groups').run();
    const insertGroup = db.prepare('INSERT INTO groups (nama_kelompok, deskripsi, status) VALUES (?, ?, ?)');
    const insertMany = db.transaction((groupsList: { name: string; desc: string }[]) => {
      for (const g of groupsList) {
        insertGroup.run(g.name, g.desc, 'available');
      }
    });
    const groupsData = Array.from({ length: 30 }, (_, i) => ({
      name: `Kelompok ${String(i + 1).padStart(2, '0')}`,
      desc: `Kelompok PKKMB UNMA ${String(i + 1).padStart(2, '0')}`,
    }));
    insertMany(groupsData);
  }

  // Use INSERT OR REPLACE to update existing student names to uppercase
  const insertStudent = db.prepare('INSERT OR REPLACE INTO students (npm, nama, prodi, is_registered) VALUES (?, ?, ?, COALESCE((SELECT is_registered FROM students WHERE npm = ?), 0))');
  const insertStudents = db.transaction((studentsList: typeof unmaMentorsList) => {
    for (const s of studentsList) {
      insertStudent.run(s.npm, s.nama.toUpperCase(), s.prodi, s.npm);
    }
  });
  insertStudents(unmaMentorsList);
}

seedDatabase();

export default db;

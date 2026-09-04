import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// On Vercel serverless functions, write to /tmp directory if cwd is read-only
let dbPath = path.join(process.cwd(), 'pkkmb_mentor.db');

if (process.env.VERCEL) {
  dbPath = path.join('/tmp', 'pkkmb_mentor.db');
}

const db = new Database(dbPath);

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
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (npm) REFERENCES students(npm),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );
`);

// List of 30 official mentor candidates
const unmaMentorsList = [
  { npm: '2322101009', nama: 'Faiz Fathulmillah', prodi: 'Ormawa Univ & UKM' },
  { npm: '2301101002', nama: 'NABIEL BAYU SATRYA RAMADHAN', prodi: 'Ormawa Univ & UKM' },
  { npm: '2301101052', nama: 'Alfat Ilafatuhshara', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101094', nama: 'Rafli Aulia', prodi: 'Ormawa Univ & UKM' },
  { npm: '2421101031', nama: 'Giar Ferdiawan', prodi: 'Ormawa Univ & UKM' },
  { npm: '2304101024', nama: 'Syahrul Dwi Teguh Nurohim', prodi: 'Ormawa Univ & UKM' },
  { npm: '2404101035', nama: 'Muhamad Arifin', prodi: 'Ormawa Univ & UKM' },
  { npm: '2310101006', nama: 'Syahril Hilman Alfariz', prodi: 'Ormawa Univ & UKM' },
  { npm: '2324101005', nama: 'Muhamad Fidiyandi', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101136', nama: 'ACHMAD SYAYIDUL IKHROM', prodi: 'Ormawa Univ & UKM' },
  { npm: '2410101019', nama: 'Nailatul Izzah Napisah', prodi: 'Ormawa Univ & UKM' },
  { npm: '2422101135', nama: 'Salsabila Kh', prodi: 'Ormawa Univ & UKM' },
  { npm: '2305101028', nama: 'Dipa Fadilan', prodi: 'Ormawa Univ & UKM' },
  { npm: '2414101091', nama: 'Muhamad Haisyam Khairizmi', prodi: 'Ormawa Univ & UKM' },
  { npm: '2322101016', nama: 'Siti Nur Anissa', prodi: 'Ormawa Univ & UKM' },
  { npm: '2411101002', nama: 'Intan Nur Afiah', prodi: 'Ormawa Univ & UKM' },
  { npm: '2410101007', nama: 'Izka Agastiar', prodi: 'Ormawa Fakultas' },
  { npm: '2310101004', nama: 'Ayang widianingsih', prodi: 'Ormawa Fakultas' },
  { npm: '2316101023', nama: 'N Sukma Alkindi', prodi: 'Ormawa Fakultas' },
  { npm: '2314101048', nama: 'Robbi Ilham M', prodi: 'Ormawa Fakultas' },
  { npm: '2306101036', nama: 'Sri Nuraeni', prodi: 'Ormawa Fakultas' },
  { npm: '2305101119', nama: "Sean Ra'uf Al-farizie", prodi: 'Ormawa Fakultas' },
  { npm: '2321101070', nama: 'Fadhil Dwi surya', prodi: 'Ormawa Fakultas' },
  { npm: '2521101038', nama: 'Farah adiba', prodi: 'Ormawa Fakultas' },
  { npm: '2307101019', nama: 'Najib Muhasyin', prodi: 'Ormawa Fakultas' },
  { npm: '2308101003', nama: 'Afifah Nuraeni', prodi: 'Ormawa Fakultas' },
  { npm: '2324101011', nama: 'Gugun Gunawan', prodi: 'Ormawa Fakultas' },
  { npm: '2422101205', nama: 'Irpan Nurhaqiqi', prodi: 'Ormawa Fakultas' },
  { npm: '2301101037', nama: 'Muhamad guntur', prodi: 'Ormawa Fakultas' },
  { npm: '2318101044', nama: 'Hafizh Lazuardi Darmawan', prodi: 'Ormawa Fakultas' },
];

function seedDatabase() {
  const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
  if (groupCount.count === 0) {
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

  const insertStudent = db.prepare('INSERT OR REPLACE INTO students (npm, nama, prodi, is_registered) VALUES (?, ?, ?, COALESCE((SELECT is_registered FROM students WHERE npm = ?), 0))');
  const insertStudents = db.transaction((studentsList: typeof unmaMentorsList) => {
    for (const s of studentsList) {
      insertStudent.run(s.npm, s.nama, s.prodi, s.npm);
    }
  });
  insertStudents(unmaMentorsList);
}

seedDatabase();

export default db;

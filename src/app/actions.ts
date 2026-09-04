'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface Student {
  npm: string;
  nama: string;
  prodi: string;
  is_registered: number;
}

export interface GroupItem {
  id: number;
  nama_kelompok: string;
  deskripsi: string;
  status: 'available' | 'taken';
  mentor_nama?: string;
  mentor_npm?: string;
  mentor_prodi?: string;
  mentor_wa?: string;
  ukuran_baju?: string;
  registered_at?: string;
}

export async function getGroupsStatus(): Promise<GroupItem[]> {
  try {
    // Flush any pending WAL checkpoint to guarantee reading freshest committed data from disk
    try {
      db.pragma('wal_checkpoint(PASSIVE)');
    } catch (e) {}

    const rows = db.prepare(`
      SELECT 
        g.id,
        g.nama_kelompok,
        g.deskripsi,
        g.status,
        UPPER(s.nama) as mentor_nama,
        s.npm as mentor_npm,
        s.prodi as mentor_prodi,
        r.no_wa as mentor_wa,
        r.ukuran_baju,
        r.registered_at
      FROM groups g
      LEFT JOIN registrations r ON g.id = r.group_id
      LEFT JOIN students s ON r.npm = s.npm
      ORDER BY g.id ASC
    `).all() as GroupItem[];

    return rows;
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

export async function submitRegistration(
  npmInput: string,
  namaInput: string,
  groupId: number,
  ukuranBajuInput: string
): Promise<{ success: boolean; message: string; groupName?: string }> {
  try {
    const cleanNpm = npmInput.trim();
    const cleanNama = namaInput.trim().toUpperCase();
    const cleanUkuran = (ukuranBajuInput || 'M').trim().toUpperCase();

    if (!cleanNpm || !cleanNama || !groupId) {
      return { success: false, message: 'Harap lengkapi Nama, NPM, dan Pilih Kelompok.' };
    }

    // Atomic SQLite Transaction
    const runClaimTransaction = db.transaction(() => {
      // 1. Strict NPM verification against official database
      const student = db.prepare('SELECT * FROM students WHERE TRIM(npm) = TRIM(?)').get(cleanNpm) as Student | undefined;

      if (!student) {
        throw new Error(`NPM ${cleanNpm} tidak terdaftar dalam draf resmi Mentor PKKMB UNMA 2026/2027. Silakan periksa kembali NPM Anda.`);
      }

      // Strict Block: Check if NPM has ALREADY claimed a group
      const existingReg = db.prepare(`
        SELECT g.nama_kelompok 
        FROM registrations r 
        JOIN groups g ON r.group_id = g.id 
        WHERE r.npm = ?
      `).get(student.npm) as { nama_kelompok: string } | undefined;

      if (student.is_registered || existingReg) {
        throw new Error(`NPM ${cleanNpm} (${student.nama}) sudah mendaftar sebelumnya untuk ${existingReg?.nama_kelompok || 'Kelompok lain'}. Setiap mentor hanya diperbolehkan memilih 1 kelompok.`);
      }

      // 2. Check if selected group is available
      const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId) as GroupItem | undefined;
      if (!group) {
        throw new Error('Kelompok yang dipilih tidak valid.');
      }
      if (group.status !== 'available') {
        throw new Error(`Maaf, ${group.nama_kelompok} baru saja diambil oleh mentor lain. Silakan pilih kelompok yang masih tersedia.`);
      }

      // 3. Mark student as registered with UPPERCASE submitted name
      db.prepare('UPDATE students SET nama = ?, is_registered = 1 WHERE npm = ?').run(cleanNama, student.npm);

      // 4. Lock group status to taken
      const updateRes = db.prepare("UPDATE groups SET status = 'taken' WHERE id = ? AND status = 'available'").run(groupId);
      if (updateRes.changes === 0) {
        throw new Error(`Gagal mengambil ${group.nama_kelompok}. Kelompok sudah terisi.`);
      }

      // 5. Clean stale registration records & insert new registration
      db.prepare('DELETE FROM registrations WHERE npm = ? OR group_id = ?').run(student.npm, groupId);
      db.prepare('INSERT INTO registrations (npm, group_id, no_wa, ukuran_baju) VALUES (?, ?, ?, ?)').run(student.npm, groupId, '-', cleanUkuran);

      return { groupName: group.nama_kelompok, officialNama: cleanNama };
    });

    const result = runClaimTransaction();

    // Flush WAL to disk immediately so concurrent read queries see the change instantly
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Berhasil! ${result.officialNama} (NPM: ${cleanNpm}) resmi terdaftar sebagai Mentor untuk ${result.groupName} (Ukuran Baju: ${cleanUkuran}).`,
      groupName: result.groupName,
    };
  } catch (error: any) {
    console.error('Registration validation error:', error);
    return {
      success: false,
      message: error.message || 'Gagal mendaftar kelompok.',
    };
  }
}

// ADMIN AUTHENTICATION SERVER ACTIONS
export async function adminLogin(usernameInput: string, passwordInput: string): Promise<{ success: boolean; message: string }> {
  const user = usernameInput.trim();
  const pass = passwordInput.trim();

  if (user === 'haisyam' && pass === '123@Haisyam') {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'authenticated_haisyam_secret', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return { success: true, message: 'Login berhasil.' };
  }

  return { success: false, message: 'Username atau Password salah.' };
}

export async function adminLogout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return { success: true };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return session?.value === 'authenticated_haisyam_secret';
}

export async function adminResetRegistration(npmInput: string): Promise<{ success: boolean; message: string }> {
  const auth = await isAdminAuthenticated();
  if (!auth) {
    return { success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' };
  }

  try {
    const runReset = db.transaction(() => {
      const reg = db.prepare('SELECT group_id FROM registrations WHERE npm = ?').get(npmInput) as { group_id: number } | undefined;
      if (reg) {
        db.prepare("UPDATE groups SET status = 'available' WHERE id = ?").run(reg.group_id);
        db.prepare('DELETE FROM registrations WHERE npm = ?').run(npmInput);
      }
      db.prepare('UPDATE students SET is_registered = 0 WHERE npm = ?').run(npmInput);
    });

    runReset();

    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, message: `Pendaftaran NPM ${npmInput} berhasil direset.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Gagal mereset data.' };
  }
}

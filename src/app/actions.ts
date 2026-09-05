'use server';

import db, { ensureDbInitialized, getJakartaTimestamp, checkRegistrationDeadline, TimeStatus } from '@/lib/db';
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

export async function getRegistrationTimeStatus(): Promise<TimeStatus> {
  return checkRegistrationDeadline();
}

export async function getGroupsStatus(): Promise<GroupItem[]> {
  try {
    await ensureDbInitialized();

    const result = await db.execute(`
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
    `);

    return result.rows.map((row) => ({
      id: Number(row.id),
      nama_kelompok: String(row.nama_kelompok),
      deskripsi: String(row.deskripsi || ''),
      status: (row.status as 'available' | 'taken') || 'available',
      mentor_nama: row.mentor_nama ? String(row.mentor_nama) : undefined,
      mentor_npm: row.mentor_npm ? String(row.mentor_npm) : undefined,
      mentor_prodi: row.mentor_prodi ? String(row.mentor_prodi) : undefined,
      mentor_wa: row.mentor_wa ? String(row.mentor_wa) : undefined,
      ukuran_baju: row.ukuran_baju ? String(row.ukuran_baju) : undefined,
      registered_at: row.registered_at ? String(row.registered_at) : undefined,
    }));
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
    // 0. Enforce Strict Server-side 10.00 WIB Deadline
    const timeStatus = checkRegistrationDeadline();
    if (timeStatus.isClosed) {
      return {
        success: false,
        message: `Mohon maaf, pendaftaran telah ditutup karena batas waktu pengisian formulir sampai pukul ${timeStatus.deadlineText} telah berakhir.`,
      };
    }

    await ensureDbInitialized();

    const cleanNpm = npmInput.trim();
    const cleanNama = namaInput.trim().toUpperCase();
    const cleanUkuran = (ukuranBajuInput || 'M').trim().toUpperCase();

    if (!cleanNpm || !cleanNama || !groupId) {
      return { success: false, message: 'Harap lengkapi Nama, NPM, dan Pilih Kelompok.' };
    }

    // 1. Strict NPM verification against official database
    const studentRes = await db.execute({
      sql: 'SELECT * FROM students WHERE TRIM(npm) = TRIM(?)',
      args: [cleanNpm],
    });
    const studentRow = studentRes.rows[0];

    if (!studentRow) {
      return {
        success: false,
        message: `NPM ${cleanNpm} tidak terdaftar dalam draf resmi Mentor PKKMB UNMA 2026/2027. Silakan periksa kembali NPM Anda.`,
      };
    }

    const officialNpm = String(studentRow.npm);
    const officialNama = String(studentRow.nama);

    // Strict Block: Check if NPM has ALREADY claimed a group
    const existingRegRes = await db.execute({
      sql: `
        SELECT g.nama_kelompok 
        FROM registrations r 
        JOIN groups g ON r.group_id = g.id 
        WHERE r.npm = ?
      `,
      args: [officialNpm],
    });

    if (Number(studentRow.is_registered) || existingRegRes.rows.length > 0) {
      const alreadyGroup = existingRegRes.rows[0]?.nama_kelompok || 'Kelompok lain';
      return {
        success: false,
        message: `NPM ${cleanNpm} (${officialNama}) sudah mendaftar sebelumnya untuk ${alreadyGroup}. Setiap mentor hanya diperbolehkan memilih 1 kelompok.`,
      };
    }

    // 2. Check if selected group is available
    const groupRes = await db.execute({
      sql: 'SELECT * FROM groups WHERE id = ?',
      args: [groupId],
    });
    const groupRow = groupRes.rows[0];

    if (!groupRow) {
      return { success: false, message: 'Kelompok yang dipilih tidak valid.' };
    }
    if (groupRow.status !== 'available') {
      return {
        success: false,
        message: `Maaf, ${groupRow.nama_kelompok} baru saja diambil oleh mentor lain. Silakan pilih kelompok yang masih tersedia.`,
      };
    }

    // 3. Atomically execute all queries in batch transaction with Asia/Jakarta timestamp
    const jakartaTime = getJakartaTimestamp();

    await db.batch(
      [
        {
          sql: 'UPDATE students SET nama = ?, is_registered = 1 WHERE npm = ?',
          args: [cleanNama, officialNpm],
        },
        {
          sql: "UPDATE groups SET status = 'taken' WHERE id = ? AND status = 'available'",
          args: [groupId],
        },
        {
          sql: 'DELETE FROM registrations WHERE npm = ? OR group_id = ?',
          args: [officialNpm, groupId],
        },
        {
          sql: 'INSERT INTO registrations (npm, group_id, no_wa, ukuran_baju, registered_at) VALUES (?, ?, ?, ?, ?)',
          args: [officialNpm, groupId, '-', cleanUkuran, jakartaTime],
        },
      ],
      'write'
    );

    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Berhasil! ${cleanNama} (NPM: ${cleanNpm}) resmi terdaftar sebagai Mentor untuk ${groupRow.nama_kelompok} (Ukuran Baju: ${cleanUkuran}).`,
      groupName: String(groupRow.nama_kelompok),
    };
  } catch (error: any) {
    console.error('Registration validation error:', error);
    const errStr = String(error?.message || '');

    if (errStr.includes('UNIQUE constraint failed: registrations.group_id') || errStr.includes('group_id')) {
      return {
        success: false,
        message: `Maaf, kelompok yang Anda pilih baru saja diambil oleh mentor lain dalam hitungan milidetik yang sama. Silakan pilih kelompok lain yang masih tersedia.`,
      };
    }

    if (errStr.includes('UNIQUE constraint failed: registrations.npm') || errStr.includes('students.npm')) {
      return {
        success: false,
        message: `NPM Anda sudah terdaftar di sistem. Setiap mentor hanya diperbolehkan memilih 1 kelompok.`,
      };
    }

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
    await ensureDbInitialized();

    const regRes = await db.execute({
      sql: 'SELECT group_id FROM registrations WHERE npm = ?',
      args: [npmInput],
    });
    const regRow = regRes.rows[0];

    const batchStmts = [];
    if (regRow) {
      batchStmts.push({
        sql: "UPDATE groups SET status = 'available' WHERE id = ?",
        args: [Number(regRow.group_id)],
      });
      batchStmts.push({
        sql: 'DELETE FROM registrations WHERE npm = ?',
        args: [npmInput],
      });
    }
    batchStmts.push({
      sql: 'UPDATE students SET is_registered = 0 WHERE npm = ?',
      args: [npmInput],
    });

    await db.batch(batchStmts, 'write');

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, message: `Pendaftaran NPM ${npmInput} berhasil direset.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Gagal mereset data.' };
  }
}


'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getGroupsStatus, isAdminAuthenticated, adminLogout, adminResetRegistration, GroupItem } from '@/app/actions';
import { ShieldCheck, Download, LogOut, RefreshCw, Lock, CheckCircle2, Search, Trash2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetLoadingNpm, setResetLoadingNpm] = useState<string | null>(null);

  const checkAuthAndFetch = useCallback(async () => {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      router.push('/login');
      return;
    }
    setAuthenticated(true);
    const data = await getGroupsStatus();
    setGroups(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    checkAuthAndFetch();
    const interval = setInterval(async () => {
      const isAuth = await isAdminAuthenticated();
      if (isAuth) {
        const data = await getGroupsStatus();
        setGroups(data);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [checkAuthAndFetch]);

  const handleLogout = async () => {
    await adminLogout();
    router.push('/login');
    router.refresh();
  };

  const handleReset = async (npm: string, nama: string, kelompok: string) => {
    if (!confirm(`Reset pendaftaran ${nama} (${npm}) untuk ${kelompok}?`)) return;
    setResetLoadingNpm(npm);
    const res = await adminResetRegistration(npm);
    setResetLoadingNpm(null);
    if (res.success) {
      checkAuthAndFetch();
    } else {
      alert(res.message);
    }
  };

  const handleExportExcel = () => {
    const takenGroups = groups.filter((g) => g.status === 'taken');
    if (takenGroups.length === 0) {
      alert('Belum ada mentor yang terdaftar untuk diexport.');
      return;
    }

    // Format CSV for Excel Compatibility (with BOM for UTF-8 in Excel)
    const headers = ['No', 'Kelompok', 'Nama Mentor', 'NPM', 'Kategori Ormawa', 'Waktu Daftar'];
    const rows = takenGroups.map((g, index) => [
      index + 1,
      `"${g.nama_kelompok}"`,
      `"${g.mentor_nama || ''}"`,
      `"${g.mentor_npm || ''}"`,
      `"${g.mentor_prodi || ''}"`,
      `"${g.registered_at ? new Date(g.registered_at).toLocaleString('id-ID') : ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Mentor_PKKMB_UNMA_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Memeriksa Sesi Admin & Data Live...
      </div>
    );
  }

  const takenCount = groups.filter((g) => g.status === 'taken').length;
  const availableCount = groups.filter((g) => g.status === 'available').length;

  const filteredGroups = groups.filter((g) => {
    const term = searchTerm.toLowerCase();
    return (
      g.nama_kelompok.toLowerCase().includes(term) ||
      g.mentor_nama?.toLowerCase().includes(term) ||
      g.mentor_npm?.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Admin Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                ADMINISTRATOR
              </span>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Dashboard Live & Rekapitulasi PKKMB
              </h1>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Top Control Bar & Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Rekapitulasi Mentor Terdaftar</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Monitor: <strong>{takenCount}</strong> Terisi • <strong>{availableCount}</strong> Tersedia (Total 30 Kelompok)
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari kelompok, nama, NPM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" /> Export ke Excel (.CSV)
            </button>
          </div>
        </div>

        {/* Live Data Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Kelompok</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Nama Mentor</th>
                  <th className="p-4">NPM</th>
                  <th className="p-4">Kategori Ormawa</th>
                  <th className="p-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredGroups.map((g, index) => {
                  const isTaken = g.status === 'taken';
                  return (
                    <tr key={g.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{index + 1}</td>
                      <td className="p-4 font-bold text-blue-900">{g.nama_kelompok}</td>
                      <td className="p-4">
                        {isTaken ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Lock className="w-3 h-3" /> Terisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Tersedia
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {isTaken ? (
                          <span className="font-bold text-slate-900">{g.mentor_nama}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada mentor</span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {isTaken ? (
                          <span className="text-slate-700 font-semibold">{g.mentor_npm}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {isTaken ? g.mentor_prodi : '-'}
                      </td>
                      <td className="p-4 text-right">
                        {isTaken && (
                          <button
                            onClick={() => handleReset(g.mentor_npm!, g.mentor_nama!, g.nama_kelompok)}
                            disabled={resetLoadingNpm === g.mentor_npm}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-[11px] border border-red-200 inline-flex items-center gap-1 transition-all"
                            title="Reset pendaftaran ini"
                          >
                            {resetLoadingNpm === g.mentor_npm ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

    </div>
  );
}

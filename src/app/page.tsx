'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getGroupsStatus, submitRegistration, GroupItem } from '@/app/actions';
import { User, GraduationCap, Send, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Lock, Shirt } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [nama, setNama] = useState('');
  const [npm, setNpm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  
  // Ukuran Baju State
  const [ukuranOption, setUkuranOption] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL' | 'custom'>('M');
  const [customUkuran, setCustomUkuran] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    const data = await getGroupsStatus();
    setGroups(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
    const interval = setInterval(fetchGroups, 3000);
    return () => clearInterval(interval);
  }, [fetchGroups]);

  useEffect(() => {
    const available = groups.find((g) => g.status === 'available');
    if (available && selectedGroupId === '') {
      setSelectedGroupId(available.id);
    }
  }, [groups, selectedGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !npm.trim() || !selectedGroupId) {
      setFeedback({ type: 'error', message: 'Harap lengkapi Nama, NPM, dan Kelompok.' });
      return;
    }

    const finalUkuran = ukuranOption === 'custom' ? (customUkuran.trim() || 'Custom') : ukuranOption;

    setSubmitting(true);
    setFeedback(null);

    const res = await submitRegistration(npm, nama, Number(selectedGroupId), finalUkuran);
    setSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}

      setNama('');
      setNpm('');
      setSelectedGroupId('');
      setUkuranOption('M');
      setCustomUkuran('');
      fetchGroups();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const availableGroups = groups.filter((g) => g.status === 'available');
  const takenGroups = groups.filter((g) => g.status === 'taken');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-slate-50 to-blue-50/30 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      
      <div className="w-full max-w-xl space-y-6">
        
        {/* Card Form Pendaftaran Utama */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-500/5 border border-slate-200/80 space-y-6">
          
          {/* Header Minimalis */}
          <div className="text-center space-y-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" /> PKKMB UNMA 2026/2027
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Pemilihan Kelompok Mentor
            </h1>
            <p className="text-xs text-slate-500">
              Pilih kelompok mentor yang tersedia. Kelompok yang sudah dipilih akan langsung terkunci.
            </p>
          </div>

          {/* Alert Notifikasi */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="font-medium">{feedback.message}</div>
            </div>
          )}

          {/* Form Direct Submit */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Nama */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Masukkan Nama Lengkap Anda..."
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Input NPM */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                NPM (Nomor Pokok Mahasiswa)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Masukkan NPM Anda..."
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <GraduationCap className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Section Ukuran Baju */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5 text-blue-600" /> Ukuran Baju Mentor
                </span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">Pilih atau isi ukuran bebas</span>
              </label>
              
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setUkuranOption(sz)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      ukuranOption === sz
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sz === 'XXL' ? 'XXL (2XL)' : sz}
                  </button>
                ))}
              </div>

              {/* Custom Size Option Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setUkuranOption('custom')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    ukuranOption === 'custom'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>Lainnya / Input Ukuran Bebas (Opsional)</span>
                  <span className="text-[10px] font-bold text-blue-600">{ukuranOption === 'custom' ? '✓ Dipilih' : '+ Input Custom'}</span>
                </button>
              </div>

              {/* Custom Input Field */}
              {ukuranOption === 'custom' && (
                <div className="mt-2 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Contoh: 3XL / 4XL / Custom LD 120cm..."
                    value={customUkuran}
                    onChange={(e) => setCustomUkuran(e.target.value)}
                    className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Dropdown Kelompok Available */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Pilih Kelompok ({availableGroups.length} Kelompok Tersedia)
              </label>
              {availableGroups.length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 font-medium text-center">
                  Seluruh kelompok 1 - 30 sudah terisi penuh.
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_kelompok} — (Tersedia)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || availableGroups.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mengunci Kelompok...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit / Pilih Kelompok
                </>
              )}
            </button>

          </form>

        </div>

        {/* Live Data Monitor Minimalis */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Data Live Mentor Terdaftar ({takenGroups.length} / 30)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Auto-Update Live</span>
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400">Memuat data live...</div>
          ) : takenGroups.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 italic">
              Belum ada mentor yang memilih kelompok. Kelompok 1 - 30 masih tersedia.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {takenGroups.map((g) => (
                <div
                  key={g.id}
                  className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-blue-900 mr-2">{g.nama_kelompok}:</span>
                      <span className="font-semibold text-slate-800">{g.mentor_nama}</span>
                      <span className="text-slate-500 font-mono text-[11px] ml-1.5 font-normal">
                        ({g.mentor_npm})
                      </span>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
                    Baju: {g.ukuran_baju || '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getGroupsStatus, submitRegistration, getRegistrationTimeStatus, GroupItem, TimeStatus } from '@/app/actions';
import { User, GraduationCap, Send, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Lock, Shirt, X, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Time & Deadline State
  const [isClosed, setIsClosed] = useState(false);
  const [deadlineText, setDeadlineText] = useState('10.00 WIB');
  const [currentWibClock, setCurrentWibClock] = useState('');
  const hasAutoShownClosedModal = useRef(false);

  // Form State
  const [nama, setNama] = useState('');
  const [npm, setNpm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  
  // Ukuran Baju State
  const [ukuranOption, setUkuranOption] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL' | 'custom'>('M');
  const [customUkuran, setCustomUkuran] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; title?: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    const data = await getGroupsStatus();
    setGroups(data);
    setLoading(false);
  }, []);

  const checkTimeStatus = useCallback(async () => {
    try {
      const status: TimeStatus = await getRegistrationTimeStatus();
      setDeadlineText(status.deadlineText);
      setIsClosed(status.isClosed);

      // Auto-open informational modal on first load if already closed
      if (status.isClosed && !hasAutoShownClosedModal.current) {
        hasAutoShownClosedModal.current = true;
        setFeedback({
          type: 'error',
          title: 'Pendaftaran Telah Ditutup',
          message: `Mohon maaf, batas waktu pengisian form pemilihan kelompok mentor PKKMB UNMA telah berakhir pada pukul ${status.deadlineText}. Formulir pendaftaran saat ini telah dinonaktifkan.`,
        });
      }
    } catch (e) {
      console.error('Error checking time status:', e);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    checkTimeStatus();

    // Ticker for polling data & time status
    const dataInterval = setInterval(() => {
      fetchGroups();
      checkTimeStatus();
    }, 3000);

    // Live clock ticker in Asia/Jakarta (WIB)
    const updateLiveClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentWibClock(`${timeStr.replace(/:/g, '.')} WIB`);

      // Real-time client-side lock trigger if clock hits >= 10:00:00
      const [h, m] = timeStr.split(/[:.]/).map(Number);
      if (h > 10 || (h === 10 && m >= 0)) {
        setIsClosed(true);
        if (!hasAutoShownClosedModal.current) {
          hasAutoShownClosedModal.current = true;
          setFeedback({
            type: 'error',
            title: 'Batas Waktu Berakhir',
            message: 'Batas waktu pemilihan kelompok telah mencapai pukul 10.00 WIB. Formulir saat ini resmi ditutup.',
          });
        }
      }
    };

    updateLiveClock();
    const clockInterval = setInterval(updateLiveClock, 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [fetchGroups, checkTimeStatus]);

  // Auto-switch selected group if current selection becomes claimed/unavailable
  useEffect(() => {
    const availableList = groups.filter((g) => g.status === 'available');
    if (availableList.length > 0) {
      const isStillAvailable = availableList.some((g) => g.id === Number(selectedGroupId));
      if (!isStillAvailable || selectedGroupId === '') {
        setSelectedGroupId(availableList[0].id);
      }
    } else {
      setSelectedGroupId('');
    }
  }, [groups, selectedGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClosed) {
      setFeedback({
        type: 'error',
        title: 'Pendaftaran Ditutup',
        message: `Batas waktu pengisian sampai pukul ${deadlineText} telah berakhir.`,
      });
      return;
    }

    if (!nama.trim() || !npm.trim() || !selectedGroupId) {
      setFeedback({
        type: 'error',
        title: 'Form Belum Lengkap',
        message: 'Harap lengkapi Nama Lengkap, NPM, dan Pilih Kelompok.',
      });
      return;
    }

    const finalUkuran = (ukuranOption === 'custom' ? (customUkuran.trim() || 'Custom') : ukuranOption).toUpperCase();

    setSubmitting(true);
    setFeedback(null);

    const res = await submitRegistration(npm, nama.toUpperCase(), Number(selectedGroupId), finalUkuran);
    setSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        title: 'Pendaftaran Berhasil 🎉',
        message: res.message,
      });
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
      } catch (err) {}

      setNama('');
      setNpm('');
      setSelectedGroupId('');
      setUkuranOption('M');
      setCustomUkuran('');
      fetchGroups();
    } else {
      setFeedback({
        type: 'error',
        title: 'Gagal Mendaftar',
        message: res.message,
      });
    }
  };

  const availableGroups = groups.filter((g) => g.status === 'available');
  const takenGroups = groups.filter((g) => g.status === 'taken');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-slate-50 to-blue-50/30 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-blue-600 selection:text-white">
      
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
              Pilih kelompok mentor yang tersedia. Kelompok yang sudah dipilih otomatis disembunyikan.
            </p>
          </div>

          {/* Banner Keterangan Waktu Limitasi (Jam 10.00 WIB) */}
          {isClosed ? (
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-900 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold uppercase tracking-wide text-red-800 block">Pendaftaran Ditutup</span>
                  <p className="text-[11px] text-red-600 font-medium">Batas waktu pengisian: Pukul {deadlineText}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-red-100 text-red-800 font-mono font-bold text-[10px] rounded-lg border border-red-200 shrink-0">
                {currentWibClock || '10.00 WIB'}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-950 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Batas Waktu Pengisian Form:</span>
                  <span className="font-extrabold text-blue-800">Hari ini s.d. Pukul {deadlineText}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-white text-blue-800 font-mono font-bold text-[10px] rounded-lg border border-blue-200 shadow-2xs shrink-0">
                WIB: {currentWibClock || 'Memuat...'}
              </span>
            </div>
          )}

          {/* Form Direct Submit */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Nama */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nama Lengkap (Huruf Kapital)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isClosed || submitting}
                  placeholder={isClosed ? "FORM SUDAH DITUTUP..." : "MASUKKAN NAMA LENGKAP..."}
                  value={nama}
                  onChange={(e) => setNama(e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-bold uppercase tracking-wide focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
                    isClosed
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-900 border-slate-200 focus:bg-white'
                  }`}
                />
                <User className={`w-4 h-4 absolute right-3.5 top-3.5 ${isClosed ? 'text-slate-300' : 'text-slate-400'}`} />
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
                  disabled={isClosed || submitting}
                  placeholder={isClosed ? "FORM SUDAH DITUTUP" : "Contoh: 2322101009"}
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
                    isClosed
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-900 border-slate-200 focus:bg-white'
                  }`}
                />
                <GraduationCap className={`w-4 h-4 absolute right-3.5 top-3.5 ${isClosed ? 'text-slate-300' : 'text-slate-400'}`} />
              </div>
            </div>

            {/* Section Ukuran Baju */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Shirt className={`w-3.5 h-3.5 ${isClosed ? 'text-slate-400' : 'text-blue-600'}`} /> Ukuran Baju Mentor
                </span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">Pilih atau isi ukuran bebas</span>
              </label>
              
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    disabled={isClosed || submitting}
                    onClick={() => setUkuranOption(sz)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      isClosed
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                        : ukuranOption === sz
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-pointer'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
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
                  disabled={isClosed || submitting}
                  onClick={() => setUkuranOption('custom')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    isClosed
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                      : ukuranOption === 'custom'
                      ? 'bg-blue-50 text-blue-800 border-blue-300 cursor-pointer'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
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
                    disabled={isClosed || submitting}
                    placeholder="Contoh: 3XL / 4XL / Custom LD 120cm..."
                    value={customUkuran}
                    onChange={(e) => setCustomUkuran(e.target.value.toUpperCase())}
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                      isClosed
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-blue-50/50 border-blue-200 text-slate-900'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Dropdown Kelompok Available (Kelompok Terisi HILANG / TIDAK DITAMPILKAN) */}
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
                  disabled={isClosed || submitting}
                  onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
                    isClosed
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 text-blue-900 border-slate-200 focus:bg-white'
                  }`}
                >
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama_kelompok}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isClosed || submitting || availableGroups.length === 0}
              className={`w-full font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                isClosed
                  ? 'bg-slate-200 text-slate-400 border border-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 cursor-pointer active:scale-[0.99] disabled:opacity-50'
              }`}
            >
              {isClosed ? (
                <>
                  <Lock className="w-4 h-4 text-slate-400" /> Pendaftaran Ditutup (Batas Pukul {deadlineText})
                </>
              ) : submitting ? (
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
                      <span className="font-extrabold text-slate-900 uppercase">{g.mentor_nama}</span>
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

      {/* MODAL NOTIFIKASI RESPONSIVE */}
      {feedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFeedback(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Decorator Gradient */}
            <div
              className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-2xl opacity-20 pointer-events-none ${
                feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />

            {/* Close Icon Button */}
            <button
              onClick={() => setFeedback(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon Badge */}
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              {feedback.type === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : isClosed ? (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-8 ring-amber-50">
                  <Lock className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-lg shadow-red-500/20 ring-8 ring-red-50">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}

              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {feedback.title || (feedback.type === 'success' ? 'Pendaftaran Berhasil!' : 'Pemberitahuan')}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {feedback.message}
              </p>
            </div>

            {/* Modal Action Button */}
            <div className="pt-2">
              <button
                onClick={() => setFeedback(null)}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer ${
                  feedback.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : isClosed
                    ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                }`}
              >
                {feedback.type === 'success' ? 'Selesai & Tutup' : isClosed ? 'Mengerti (Lihat Data Live)' : 'Tutup & Coba Lagi'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}



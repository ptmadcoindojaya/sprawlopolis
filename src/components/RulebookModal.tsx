import React from 'react';
import { BookOpen, X, CheckCircle2, ShieldCheck, MapPin, Layers } from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292524]/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 relative text-[#292524] max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8dfd0]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a]">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#292524]">
              Panduan & Aturan Bermain Sprawlopolis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716c] hover:text-[#292524] rounded-xl hover:bg-[#efe9dc] transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs leading-relaxed text-[#57534e]">
          {/* Section 1: Ringkasan & Tujuan */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-[#9a4629] text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#c86b4a]" />
              1. Tujuan Permainan
            </h4>
            <p>
              Sprawlopolis adalah permainan mikro tata kota solo/kooperatif dengan <strong className="text-[#292524]">18 kartu dua sisi</strong>. Anda bertugas membangun tata kota yang dinamis dan efisien dengan menata blok perumahan, bisnis, industri, taman, dan jaringan jalan.
            </p>
            <p className="text-[#9a4629] font-semibold">
              Tujuan Utama: Mencapai atau melampaui Total Target Skor yang dihasilkan dari akumulasi angka 3 Kartu Misi yang diundi di awal permainan.
            </p>
          </div>

          {/* Section 2: Anatomi Kartu */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-[#9a4629] text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#c86b4a]" />
              2. Anatomi Kartu Dua Sisi
            </h4>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-[#292524]">Sisi Misi (Goal):</strong> Memiliki nomor kartu (1-18), judul misi, target poin, dan penjelasan kondisi skor khusus.
              </li>
              <li>
                <strong className="text-[#292524]">Sisi Kota (City/Blocks):</strong> Berisi kisi 2x2 (4 blok zona):
                <ul className="pl-5 pt-1.5 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#f4a28c] border border-[#d37e68] inline-block shrink-0" />
                    <span>🏡 <strong className="text-[#292524]">Perumahan (R / Residential - Terakota Lembut)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#8ec5e8] border border-[#679fc4] inline-block shrink-0" />
                    <span>🏬 <strong className="text-[#292524]">Bisnis / Komersial (C / Commercial - Biru Langit)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#d8c39e] border border-[#b39b74] inline-block shrink-0" />
                    <span>🏭 <strong className="text-[#292524]">Industri (I / Industrial - Krem Gandum)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#9fd3a8] border border-[#76ae80] inline-block shrink-0" />
                    <span>🌲 <strong className="text-[#292524]">Taman (P / Park - Hijau Sage)</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#646e78] border border-[#4c555e] inline-block shrink-0" />
                    <span>🛣️ <strong className="text-[#292524]">Jalan (Roads):</strong> Melintas di atas blok dan dapat tersambung antar-kartu.</span>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          {/* Section 3: Aturan Penempatan */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-[#9a4629] text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#c86b4a]" />
              3. Cara Bermain & Penempatan Kartu
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>
                Di awal permainan, <strong className="text-[#292524]">3 kartu</strong> diundi sebagai Misi Khusus (Goal Cards) dan <strong className="text-[#292524]">1 kartu</strong> diletakkan di papan sebagai Kartu Awal Kota.
              </li>
              <li>
                Pemain memegang <strong className="text-[#292524]">3 kartu</strong> di tangan. Pilih 1 kartu untuk dipasang ke grid kota.
              </li>
              <li>
                Anda dapat memutar kartu (0° atau 180°) sebelum dipasang.
              </li>
              <li>
                <strong className="text-[#9a4629]">Aturan Penumpukan (Overlapping):</strong> Kartu baru yang diletakkan harus menempel pada kartu lama yang sudah ada di kota (minimal 1 blok bersentuhan). Kartu baru BISA menumpuk/menutupi 1, 2, atau 3 blok pada kartu sebelumnya!
              </li>
              <li>
                Setelah kartu dipasang, ambil 1 kartu dari dek sehingga kartu tangan kembali menjadi 3, hingga seluruh 15 kartu kota selesai diletakkan.
              </li>
            </ol>
          </div>

          {/* Section 4: Sistem Skor */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-[#9a4629] text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#c86b4a]" />
              4. Sistem Perhitungan Poin Akhir
            </h4>
            <div className="space-y-2">
              <p>Total Skor Anda dihitung dari rumus berikut:</p>
              <div className="bg-[#fbf8f2] p-2.5 rounded-xl font-mono font-bold text-[#9a4629] text-[11px] text-center border border-[#dfd5c3]">
                Skor = (Grup R + C + I + P Terbesar) + (Skor 3 Misi) - (Penalti Jalur Jalan)
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <strong className="text-[#292524]">Grup Zona Terbesar:</strong> Dapatkan +1 poin untuk setiap blok dalam kelompok bersambung terbesar untuk masing-masing zona (R, C, I, P).
                </li>
                <li>
                  <strong className="text-[#b8463a]">Penalti Jalan:</strong> Hitung total jaringan/jalur jalan terpisah di kota Anda. Setiap 1 jalur jalan terpisah mengurangi 1 poin (-1 poin per jalur). Makin panjang dan terhubung jalan Anda, makin sedikit penaltinya!
                </li>
                <li>
                  <strong className="text-[#292524]">Skor Misi Khusus:</strong> Poin tambahan yang diperoleh dari mengevaluasi kondisi 3 kartu Misi.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#e8dfd0] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 cozy-btn-primary font-bold rounded-xl transition-transform active:scale-[0.98] text-xs"
          >
            Mengerti & Mulai Bermain
          </button>
        </div>
      </div>
    </div>
  );
};

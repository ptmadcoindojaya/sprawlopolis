import React, { useState } from 'react';
import { parseRulesFromXls, downloadSampleXlsTemplate } from '../utils/xlsParser';
import { SprawlopolisCard } from '../types';
import { FileSpreadsheet, Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';

interface XlsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomCards: (cards: SprawlopolisCard[]) => void;
}

export const XlsImportModal: React.FC<XlsImportModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomCards
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [parsedCards, setParsedCards] = useState<SprawlopolisCard[] | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsParsing(true);
    setMessages([]);

    const result = await parseRulesFromXls(selected);
    setIsParsing(false);

    if (result.errors.length > 0) {
      setMessages(result.errors);
    } else {
      setMessages([`Berhasil mengimpor ${result.successCount} aturan kartu dari file XLS!`]);
      setParsedCards(result.cards);
    }
  };

  const handleApply = () => {
    if (parsedCards) {
      onApplyCustomCards(parsedCards);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292524]/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative text-[#292524]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8dfd0]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#e7f3ea] border border-[#b4ddb9] rounded-xl text-[#2d6a3e]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#292524]">
              Impor Aturan & Kartu dari File XLS
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

        <p className="text-xs text-[#57534e] leading-relaxed">
          Anda dapat mengunggah file spreadsheet Excel (<code className="text-[#2d6a3e] font-mono font-semibold">.xls</code>, <code className="text-[#2d6a3e] font-mono font-semibold">.xlsx</code>) yang berisi aturan kustom, terjemahan, atau variasi target skor untuk Sprawlopolis.
        </p>

        {/* Template Download Section */}
        <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#292524]">Unduh Format Spreadsheet Template</div>
            <div className="text-[11px] text-[#78716c]">Gunakan format ini sebagai acuan pengisian data kartu & misi.</div>
          </div>
          <button
            onClick={downloadSampleXlsTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#e7f3ea] hover:bg-[#d8ecd9] text-[#235430] border border-[#9fd3a8] rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh .XLSX</span>
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="border-2 border-dashed border-[#c8b99e] hover:border-[#5e9a6b] rounded-2xl p-6 text-center transition-colors bg-[#f4efe6]/70">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="xls-file-input"
          />
          <label htmlFor="xls-file-input" className="cursor-pointer flex flex-col items-center gap-2">
            <div className="p-3 bg-[#fbf8f2] border border-[#ddd4c3] rounded-2xl text-[#3e7b4c] shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#292524]">
              {file ? file.name : 'Klik atau tarik file XLS / XLSX ke sini'}
            </span>
            <span className="text-[11px] text-[#78716c]">Mendukung format .XLS, .XLSX, dan .CSV</span>
          </label>
        </div>

        {/* Feedback Messages */}
        {isParsing && (
          <div className="text-center text-xs text-[#2d6a3e] font-mono font-semibold">
            Memproses file spreadsheet XLS...
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-xs p-3 rounded-xl bg-[#f4efe6] border border-[#dfd5c3]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-1.5 ${
                  parsedCards ? 'text-[#235430]' : 'text-[#b8463a]'
                }`}
              >
                {parsedCards ? (
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{m}</span>
              </div>
            ))}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8dfd0]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] font-semibold rounded-xl text-xs transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedCards}
            className="px-5 py-2 cozy-btn-sage disabled:opacity-45 font-bold rounded-xl transition-transform active:scale-[0.98] text-xs"
          >
            Terapkan Aturan Baru
          </button>
        </div>
      </div>
    </div>
  );
};

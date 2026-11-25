import React from 'react';
import { TotalScoreBreakdown, GoalCard } from '../types';
import { Trophy, X, ShieldAlert, Route, Sparkles } from 'lucide-react';

interface ScorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  scoreBreakdown: TotalScoreBreakdown;
  goals?: GoalCard[];
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  isOpen,
  onClose,
  scoreBreakdown
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292524]/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative text-[#292524]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8dfd0]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a]">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#292524]">
              Rincian Perhitungan Skor Kota
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

        {/* Target vs Current Total Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            scoreBreakdown.isVictory
              ? 'bg-[#e7f3ea] border-[#9fd3a8] text-[#235430]'
              : 'bg-[#f4e5d3]/75 border-[#e3ccb0] text-[#7c351e]'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold text-[#57534e]">Status Kemenangan</div>
            <div className="text-lg font-extrabold mt-0.5 tracking-tight">
              {scoreBreakdown.isVictory ? 'Menang (Victory)' : 'Belum Mencapai Target'}
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-[11px] text-[#57534e]">Skor / Target</div>
            <div className="text-2xl font-extrabold text-[#292524]">
              {scoreBreakdown.totalScore} / {scoreBreakdown.targetScore}
            </div>
          </div>
        </div>

        {/* Score Categories */}
        <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
          {/* 1. Base Contiguous Groups */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4c86ad]" />
              <span>1. Poin Kelompok Zona Terbesar</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between p-2.5 bg-[#f4a28c]/35 rounded-xl border border-[#f4a28c]/70 text-[#4e2218]">
                <span className="font-sans font-semibold">🏡 Perumahan (R)</span>
                <span className="font-bold">+{scoreBreakdown.residentialGroupScore}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#8ec5e8]/35 rounded-xl border border-[#8ec5e8]/70 text-[#193b52]">
                <span className="font-sans font-semibold">🏬 Bisnis (C)</span>
                <span className="font-bold">+{scoreBreakdown.commercialGroupScore}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#d8c39e]/45 rounded-xl border border-[#c7ae83]/80 text-[#453620]">
                <span className="font-sans font-semibold">🏭 Industri (I)</span>
                <span className="font-bold">+{scoreBreakdown.industrialGroupScore}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#9fd3a8]/40 rounded-xl border border-[#9fd3a8]/80 text-[#1e4627]">
                <span className="font-sans font-semibold">🌲 Taman (P)</span>
                <span className="font-bold">+{scoreBreakdown.parkGroupScore}</span>
              </div>
            </div>
          </div>

          {/* 2. Road Network Penalty */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-1.5">
            <div className="text-xs font-bold text-[#292524] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Route className="w-4 h-4 text-[#646e78]" />
                <span>2. Penalti Jaringan Jalan</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#b8463a] tabular-nums">
                -{scoreBreakdown.roadPenalty} Poin
              </span>
            </div>
            <p className="text-[11px] text-[#57534e] leading-relaxed">
              Terdeteksi <span className="text-[#292524] font-bold font-mono tabular-nums">{scoreBreakdown.roadNetworkCount}</span> jalur jalan terpisah. Setiap jaringan jalan terpisah mengurangi 1 poin (-1 poin per jalur).
            </p>
          </div>

          {/* 3. Active Goal Cards Evaluation */}
          <div className="bg-[#f4efe6] border border-[#dfd5c3] rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-[#292524] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#c86b4a]" />
              <span>3. Poin Misi Khusus</span>
            </div>

            <div className="space-y-2">
              {scoreBreakdown.goalScores.map((g) => (
                <div key={g.goalId} className="p-3 bg-[#fbf8f2] rounded-xl border border-[#e5dccb] space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-[#292524]">
                      Misi #{g.goalId}: {g.title}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums shrink-0 ${
                        g.score >= 0 ? 'text-[#2d6a3e]' : 'text-[#b8463a]'
                      }`}
                    >
                      {g.score >= 0 ? `+${g.score}` : g.score} Poin
                    </span>
                  </div>
                  <p className="text-[11px] text-[#57534e] leading-snug">
                    {g.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 cozy-btn-primary font-bold rounded-xl transition-transform active:scale-[0.99] text-sm"
        >
          Tutup Rincian
        </button>
      </div>
    </div>
  );
};

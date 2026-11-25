import React from 'react';
import { TotalScoreBreakdown, GoalCard } from '../types';
import { Trophy, RefreshCw, Eye, Flame, Users, Sparkles, ShieldAlert, Route } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  scoreBreakdown: TotalScoreBreakdown;
  goals?: GoalCard[];
  onRestart: () => void;
  onInspectBoard: () => void;
  onOpenLobby?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  scoreBreakdown,
  goals = [],
  onRestart,
  onInspectBoard,
  onOpenLobby
}) => {
  if (!isOpen) return null;

  const isWin = scoreBreakdown.isVictory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292524]/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#fbf8f2] border border-[#ddd4c3] rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 text-center relative text-[#292524] my-auto max-h-[90vh] overflow-y-auto">
        {/* Banner Icon */}
        <div className="flex justify-center">
          <div
            className={`p-3.5 rounded-2xl border ${
              isWin
                ? 'bg-[#e7f3ea] border-[#9fd3a8] text-[#2d6a3e]'
                : 'bg-[#fae8e4] border-[#f4a28c] text-[#b8463a]'
            }`}
          >
            {isWin ? <Trophy className="w-9 h-9" /> : <Flame className="w-9 h-9" />}
          </div>
        </div>

        {/* Title & Status */}
        <div className="space-y-1">
          <div
            className={`text-xs font-bold tracking-wide ${
              isWin ? 'text-[#2d6a3e]' : 'text-[#b8463a]'
            }`}
          >
            {isWin ? 'Status: Menang (Victory)' : 'Status: Belum Tercapai'}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-[#292524]">
            {isWin ? 'Selamat! Kota Sukses Terbangun' : 'Permainan Selesai'}
          </h2>
          <p className="text-xs text-[#57534e] max-w-md mx-auto">
            {isWin
              ? 'Anda berhasil melampaui total target skor yang ditentukan oleh ketiga kartu target.'
              : 'Total skor akhir kota Anda belum memenuhi syarat minimal target poin.'}
          </p>
        </div>

        {/* Final Score Cards Banner */}
        <div
          className={`border rounded-2xl p-4 flex items-center justify-around font-mono tabular-nums ${
            isWin
              ? 'bg-[#e7f3ea]/75 border-[#9fd3a8]'
              : 'bg-[#f4efe6] border-[#dfd5c3]'
          }`}
        >
          <div>
            <div className="text-[11px] font-sans text-[#57534e] font-semibold">Total Skor Akhir</div>
            <div className={`text-3xl font-extrabold mt-0.5 ${isWin ? 'text-[#235430]' : 'text-[#9a4629]'}`}>
              {scoreBreakdown.totalScore}
            </div>
          </div>
          <div className="text-[#a89d8c] text-2xl font-light">/</div>
          <div>
            <div className="text-[11px] font-sans text-[#57534e] font-semibold">Target Minimal</div>
            <div className="text-3xl font-extrabold text-[#292524] mt-0.5">
              {scoreBreakdown.targetScore}
            </div>
          </div>
        </div>

        {/* Detailed Target Cards Breakdown */}
        <div className="space-y-2 text-left">
          <div className="text-xs font-bold text-[#292524] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#c86b4a]" />
            <span>Rincian Poin Misi Target Kartu</span>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {scoreBreakdown.goalScores.map((g) => {
              const matchingGoal = goals.find((cardGoal) => cardGoal.id === g.goalId);
              const targetPts = matchingGoal ? matchingGoal.targetPoints : g.goalId;

              return (
                <div key={g.goalId} className="p-2.5 bg-[#f4efe6] rounded-xl border border-[#dfd5c3] space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-[#292524]">
                      Misi #{g.goalId}: {g.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs tabular-nums shrink-0">
                      <span className="text-[#78716c] text-[10px]">Target +{targetPts}</span>
                      <span className={`font-bold ${g.score >= 0 ? 'text-[#2d6a3e]' : 'text-[#b8463a]'}`}>
                        {g.score >= 0 ? `+${g.score}` : g.score} Pt
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#57534e] leading-snug">
                    {g.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Base Zone & Road Penalty Breakdown */}
        <div className="text-xs space-y-2 text-left bg-[#f4efe6] p-3.5 rounded-2xl border border-[#dfd5c3] font-mono tabular-nums">
          <div className="text-[11px] font-sans font-bold text-[#292524] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4c86ad]" />
            <span>Skor Dasar & Penalti</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex justify-between p-2 bg-[#f4a28c]/35 rounded-xl border border-[#f4a28c]/70 text-[#4e2218]">
              <span className="font-sans font-semibold">🏡 Perumahan</span>
              <span className="font-bold">+{scoreBreakdown.residentialGroupScore}</span>
            </div>
            <div className="flex justify-between p-2 bg-[#8ec5e8]/35 rounded-xl border border-[#8ec5e8]/70 text-[#193b52]">
              <span className="font-sans font-semibold">🏬 Bisnis</span>
              <span className="font-bold">+{scoreBreakdown.commercialGroupScore}</span>
            </div>
            <div className="flex justify-between p-2 bg-[#d8c39e]/45 rounded-xl border border-[#c7ae83]/80 text-[#453620]">
              <span className="font-sans font-semibold">🏭 Industri</span>
              <span className="font-bold">+{scoreBreakdown.industrialGroupScore}</span>
            </div>
            <div className="flex justify-between p-2 bg-[#9fd3a8]/40 rounded-xl border border-[#9fd3a8]/80 text-[#1e4627]">
              <span className="font-sans font-semibold">🌲 Taman</span>
              <span className="font-bold">+{scoreBreakdown.parkGroupScore}</span>
            </div>
          </div>
          <div className="flex justify-between text-[#57534e] pt-2 border-t border-[#e5dccb] text-[11px]">
            <span className="font-sans flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#646e78]" />
              Penalti Jalan ({scoreBreakdown.roadNetworkCount} jalur)
            </span>
            <span className="font-bold text-[#b8463a]">-{scoreBreakdown.roadPenalty}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            onClick={onInspectBoard}
            className="w-full sm:flex-1 py-2.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#292524] font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#ddd4c3]"
          >
            <Eye className="w-4 h-4 text-[#57534e]" />
            <span>Lihat Kota</span>
          </button>

          {onOpenLobby && (
            <button
              onClick={onOpenLobby}
              className="w-full sm:flex-1 py-2.5 bg-[#e6f2fa] hover:bg-[#d6eaf7] text-[#193b52] font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-[#8ec5e8]"
            >
              <Users className="w-4 h-4" />
              <span>Menu Lobi</span>
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-2.5 cozy-btn-primary font-bold rounded-xl transition-transform active:scale-[0.98] text-xs flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Main Lagi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { GoalCard, TotalScoreBreakdown } from '../types';
import {
  Target,
  Trophy,
  Flame,
  Move,
  GripHorizontal,
  ChevronRight,
  EyeOff,
  Route,
  Map as MapIcon,
  LayoutGrid,
  Link2
} from 'lucide-react';

interface GoalHeaderProps {
  goals: GoalCard[];
  scoreBreakdown: TotalScoreBreakdown;
  onOpenScoreDetails: () => void;
}

const CATEGORY_STYLE: Record<
  GoalCard['category'],
  { label: string; headerBg: string; border: string; accentText: string; icon: React.ReactNode }
> = {
  road: {
    label: 'Jalan',
    headerBg: 'bg-[#e7eaed]',
    border: 'border-[#c4ccd4]',
    accentText: 'text-[#424d57]',
    icon: <Route className="w-3 h-3 shrink-0" />
  },
  zone: {
    label: 'Wilayah',
    headerBg: 'bg-[#e7f1e8]',
    border: 'border-[#bad3be]',
    accentText: 'text-[#2e5f3a]',
    icon: <MapIcon className="w-3 h-3 shrink-0" />
  },
  pattern: {
    label: 'Pola Kota',
    headerBg: 'bg-[#e6f0f6]',
    border: 'border-[#b9d2e3]',
    accentText: 'text-[#2f5b78]',
    icon: <LayoutGrid className="w-3 h-3 shrink-0" />
  },
  adjacency: {
    label: 'Kedekatan',
    headerBg: 'bg-[#f5e9da]',
    border: 'border-[#dec4a6]',
    accentText: 'text-[#8c4829]',
    icon: <Link2 className="w-3 h-3 shrink-0" />
  }
};

export const GoalHeader: React.FC<GoalHeaderProps> = ({
  goals,
  scoreBreakdown,
  onOpenScoreDetails
}) => {
  const [isDockHidden, setIsDockHidden] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number; initialPosX: number; initialPosY: number }>({
    x: 0,
    y: 0,
    initialPosX: 0,
    initialPosY: 0
  });

  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.initialPosX + dx,
        y: dragStartRef.current.initialPosY + dy
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const currentTotal = scoreBreakdown.totalScore;
  const targetTotal = scoreBreakdown.targetScore;
  const progressPct = Math.min(100, Math.max(0, (currentTotal / Math.max(1, targetTotal)) * 100));

  const zoneChips = [
    {
      code: 'R',
      label: 'Residensial',
      value: scoreBreakdown.residentialGroupScore,
      bg: 'bg-[#f6e3d8]',
      border: 'border-[#e4bea9]',
      text: 'text-[#8c3f23]'
    },
    {
      code: 'C',
      label: 'Komersial',
      value: scoreBreakdown.commercialGroupScore,
      bg: 'bg-[#dfeef8]',
      border: 'border-[#b3d4eb]',
      text: 'text-[#25577a]'
    },
    {
      code: 'I',
      label: 'Industri',
      value: scoreBreakdown.industrialGroupScore,
      bg: 'bg-[#ece6da]',
      border: 'border-[#cfc3ae]',
      text: 'text-[#554a3c]'
    },
    {
      code: 'P',
      label: 'Taman',
      value: scoreBreakdown.parkGroupScore,
      bg: 'bg-[#e2f2e6]',
      border: 'border-[#b1d8ba]',
      text: 'text-[#245932]'
    }
  ];

  // Docked Minimal Hide State Button (Left Edge)
  if (isDockHidden) {
    return (
      <div
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none'
        }}
        className="fixed top-14 left-2 z-30 select-none"
      >
        <button
          onClick={() => setIsDockHidden(false)}
          className="cozy-panel flex items-center gap-2.5 hover:bg-[#fffdf9] text-[#292524] font-bold px-3 py-2 rounded-2xl transition-all group cursor-pointer"
          title="Buka Panel Kartu Misi & Skor"
        >
          <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a]">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] text-[#78716c] font-semibold leading-none mb-0.5">
              Kartu Misi
            </span>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#292524] font-mono tabular-nums">
              <span>{currentTotal}</span>
              <span className="px-1 py-[1px] rounded bg-[#f4e5d3] border border-[#e3ccb0] text-[#a34d2c] text-[10px] leading-none">
                T {targetTotal}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#c86b4a] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none'
      }}
      className={`fixed top-14 left-2 z-30 w-[296px] sm:w-[324px] max-w-[90vw] transition-transform duration-150 select-none ${
        isDragging ? 'opacity-95 scale-[1.01]' : ''
      }`}
    >
      <div className="cozy-panel rounded-2xl p-2.5 backdrop-blur-md">
        {/* Drag & Hide Header Banner */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#e8dfd0]">
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#78716c] hover:text-[#292524] cursor-grab active:cursor-grabbing px-1 py-0.5 rounded transition-colors group flex-1"
            title="Tarik / Drag untuk Memindahkan Panel Kartu Misi"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Kartu Misi</span>
            <GripHorizontal className="w-3.5 h-3.5 text-[#a89d8c] group-hover:text-[#c86b4a] ml-auto" />
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onOpenScoreDetails}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors border whitespace-nowrap cursor-pointer ${
                scoreBreakdown.isVictory
                  ? 'bg-[#e7f3ea] text-[#235430] border-[#9fd3a8] hover:bg-[#d8ecd9]'
                  : 'bg-[#f4e5d3] text-[#9a4629] border-[#e3ccb0] hover:bg-[#ecd7be]'
              }`}
              title="Buka Rincian Hitungan Poin Lengkap"
            >
              {scoreBreakdown.isVictory ? <Trophy className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
              <span>Rincian</span>
            </button>

            <button
              onClick={() => setIsDockHidden(true)}
              className="px-2 py-1 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
              title="Lipat Panel Kartu Misi"
            >
              <EyeOff className="w-3 h-3" />
              <span className="hidden sm:inline">Lipat</span>
            </button>
          </div>
        </div>

        {/* Cozy Score & Target (T) + RCIP & Road Penalty Overview */}
        <div className="rounded-xl bg-[#f7f2e8]/90 border border-[#e3d9c6] p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#d97757] text-[#fffdf9] border border-[#bd5f40] font-mono text-[11px] font-extrabold tabular-nums shadow-2xs"
                title={`Target Poin Kemenangan: ${targetTotal}`}
              >
                <span>T</span>
                <span>{targetTotal}</span>
              </span>
              <div className="flex items-baseline gap-1 font-sans">
                <span className="text-[11px] font-semibold text-[#6b6258]">Skor</span>
                <span
                  className={`text-sm font-extrabold font-mono tabular-nums ${
                    scoreBreakdown.isVictory ? 'text-[#245932]' : 'text-[#292524]'
                  }`}
                >
                  {currentTotal}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono font-semibold text-[#78716c] tabular-nums">
              {scoreBreakdown.isVictory ? 'Target Tercapai' : `Kurang ${Math.max(0, targetTotal - currentTotal)}`}
            </span>
          </div>

          {/* Slim Cozy Progress Bar */}
          <div className="w-full h-1.5 bg-[#e9e0cf] rounded-full overflow-hidden p-[1px] border border-[#dad0bc]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                scoreBreakdown.isVictory ? 'bg-[#5e9a6b]' : 'bg-[#d97757]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* R · C · I · P Zone Group Scores + Road Penalty Strip */}
          <div className="grid grid-cols-5 gap-1">
            {zoneChips.map((z) => (
              <div
                key={z.code}
                className={`${z.bg} ${z.border} ${z.text} border rounded-lg px-1 py-1 flex flex-col items-center justify-center leading-none`}
                title={`Blok ${z.label} terbesar: +${z.value} poin`}
              >
                <span className="text-[9px] font-extrabold tracking-wide opacity-85">{z.code}</span>
                <span className="text-[11px] font-mono font-extrabold tabular-nums mt-0.5">
                  +{z.value}
                </span>
              </div>
            ))}

            {/* Road Penalty Chip */}
            <div
              className="bg-[#f8e4e0] border border-[#e9bbb2] text-[#9a3425] rounded-lg px-1 py-1 flex flex-col items-center justify-center leading-none"
              title={`Penalti Jalan: ${scoreBreakdown.roadNetworkCount} ruas jalan (${scoreBreakdown.roadPenalty} poin)`}
            >
              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold opacity-90">
                <Route className="w-2.5 h-2.5 shrink-0" />
                <span>Jln</span>
              </span>
              <span className="text-[11px] font-mono font-extrabold tabular-nums mt-0.5">
                {scoreBreakdown.roadPenalty}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Open Readable Mission Cards Directly Visible */}
        <div className="space-y-2 mt-2.5 max-h-[calc(100vh-310px)] overflow-y-auto pr-1 pb-0.5">
          {goals.map((goal) => {
            const breakdown = scoreBreakdown.goalScores.find((s) => s.goalId === goal.id);
            const scoreVal = breakdown?.score || 0;
            const cat = CATEGORY_STYLE[goal.category] || CATEGORY_STYLE.zone;

            return (
              <div
                key={goal.id}
                className="goal-card-25d rounded-xl border border-[#cfc0a7] overflow-hidden hover:border-[#c86b4a]/75 transition-colors"
              >
                {/* Cardstock Top Ribbon Header */}
                <div
                  className={`${cat.headerBg} border-b ${cat.border} px-2.5 py-1.5 flex items-center justify-between gap-2`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-[#fdfaf3] border border-[#d6c8b0] rounded-md text-[10px] font-mono font-bold text-[#8c4829] tabular-nums shrink-0">
                      #{goal.id}
                    </span>
                    <span className="text-[11.5px] font-bold text-[#292524] tracking-tight truncate">
                      {goal.title}
                    </span>
                  </div>

                  {/* Cozy Target Point Badge ("T") */}
                  <div
                    className="px-1.5 py-0.5 rounded-md bg-[#d97757] text-[#fffdf9] border border-[#bd5f40] font-mono font-extrabold text-[10px] tabular-nums shrink-0 shadow-2xs"
                    title={`Kontribusi target poin: T ${goal.targetPoints}`}
                  >
                    T {goal.targetPoints}
                  </div>
                </div>

                {/* Inner Framed Parchment Description Body */}
                <div className="px-2.5 py-2 bg-[#fdfaf3]">
                  <p className="text-[11px] text-[#3a342e] leading-relaxed font-sans">
                    {goal.descriptionId || goal.description}
                  </p>
                </div>

                {/* Card Footer: Category Tag & Live Score Contribution */}
                <div className="px-2.5 py-1 bg-[#f5f0e6] border-t border-[#e7dcc9] flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold ${cat.accentText}`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-extrabold tabular-nums ${
                      scoreVal > 0
                        ? 'bg-[#e6f3e9] text-[#235430] border-[#a9d4b2]'
                        : scoreVal < 0
                        ? 'bg-[#fae8e4] text-[#9a3425] border-[#efb3a5]'
                        : 'bg-[#fbf8f2] text-[#78716c] border-[#ddd4c3]'
                    }`}
                  >
                    {scoreVal > 0 ? `+${scoreVal}` : scoreVal} Pt
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

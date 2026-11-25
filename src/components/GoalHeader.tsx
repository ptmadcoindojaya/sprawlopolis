import React, { useState, useRef, useEffect } from 'react';
import { GoalCard, TotalScoreBreakdown } from '../types';
import {
  Target,
  Trophy,
  Flame,
  ChevronDown,
  ChevronUp,
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
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
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
          className="cozy-panel flex items-center gap-2.5 hover:bg-[#fffdf9] text-[#292524] font-bold px-3 py-2 rounded-2xl transition-all group"
          title="Tampilkan Kartu Misi & Skor"
        >
          <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a]">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] text-[#78716c] font-semibold leading-none mb-0.5">
              Kartu Misi
            </span>
            <span className="text-xs font-extrabold text-[#292524] font-mono tabular-nums">
              {currentTotal} / {targetTotal} Pt
            </span>
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
      className={`fixed top-14 left-2 z-30 w-[290px] sm:w-[316px] max-w-[90vw] transition-transform duration-150 select-none ${
        isDragging ? 'opacity-95 scale-[1.01]' : ''
      }`}
    >
      <div className="cozy-panel rounded-2xl p-2.5 backdrop-blur-md">
        {/* Drag & Dock Header Banner */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#e8dfd0]">
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#78716c] hover:text-[#292524] cursor-grab active:cursor-grabbing px-1 py-0.5 rounded transition-colors group flex-1"
            title="Tarik / Drag untuk Memindahkan Panel Target"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Kartu Misi (Geser)</span>
            <GripHorizontal className="w-3.5 h-3.5 text-[#a89d8c] group-hover:text-[#c86b4a] ml-auto" />
          </div>

          <button
            onClick={() => setIsDockHidden(true)}
            className="px-2 py-1 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-lg transition-colors ml-2 flex items-center gap-1 text-[10px] font-semibold"
            title="Sembunyikan ke Dock Kiri"
          >
            <EyeOff className="w-3 h-3" />
            <span className="hidden sm:inline">Sembunyikan</span>
          </button>
        </div>

        {/* Top Score Summary Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#f4e5d3] border border-[#e3ccb0] rounded-xl text-[#c86b4a] shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-extrabold text-[#292524]">Target Skor</span>
                <span className="text-[11px] font-mono font-bold text-[#b95e3d] tabular-nums">
                  {targetTotal} Pt
                </span>
              </div>
              <div className="text-[11px] text-[#57534e] font-mono tabular-nums">
                Skor: <span className="text-[#292524] font-bold">{currentTotal}</span> / {targetTotal}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenScoreDetails}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold transition-colors border whitespace-nowrap ${
                scoreBreakdown.isVictory
                  ? 'bg-[#e7f3ea] text-[#235430] border-[#9fd3a8] hover:bg-[#d8ecd9]'
                  : 'bg-[#f4e5d3] text-[#9a4629] border-[#e3ccb0] hover:bg-[#ecd7be]'
              }`}
              title="Rincian Hitungan Poin"
            >
              {scoreBreakdown.isVictory ? <Trophy className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
              <span>Rincian</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-[#f4efe6] hover:bg-[#ebe3d4] text-[#57534e] hover:text-[#292524] border border-[#ddd4c3] rounded-xl transition-colors"
              title={isExpanded ? 'Ciutkan Kartu Misi' : 'Tampilkan Kartu Misi'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 mb-0.5">
          <div className="w-full h-1.5 bg-[#ebe3d4] rounded-full overflow-hidden p-[1px] border border-[#ddd4c3]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                scoreBreakdown.isVictory ? 'bg-[#5e9a6b]' : 'bg-[#d97757]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 3 Physical 2.5D Tabletop Goal Cards (Height capped safely above bottom CardHand) */}
        {isExpanded && (
          <div className="space-y-2.5 mt-2.5 pt-2.5 border-t border-[#e8dfd0] max-h-[calc(100vh-290px)] overflow-y-auto pr-1 pb-0.5">
            {goals.map((goal) => {
              const breakdown = scoreBreakdown.goalScores.find((s) => s.goalId === goal.id);
              const scoreVal = breakdown?.score || 0;
              const cat = CATEGORY_STYLE[goal.category] || CATEGORY_STYLE.zone;

              return (
                <div
                  key={goal.id}
                  className="goal-card-25d rounded-xl border-[1.5px] border-[#cbbca3] overflow-hidden hover:border-[#c86b4a]/70 transition-colors"
                >
                  {/* Cardstock Top Ribbon Header */}
                  <div
                    className={`${cat.headerBg} border-b ${cat.border} px-2.5 py-1.5 flex items-center justify-between gap-2`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 bg-[#fdfaf3] border border-[#d6c8b0] rounded-md text-[10px] font-mono font-extrabold text-[#8c4829] tabular-nums shrink-0 shadow-2xs">
                        #{goal.id}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#292524] tracking-tight truncate uppercase">
                        {goal.title}
                      </span>
                    </div>

                    {/* Prominent Tabletop Target Point Medallion */}
                    <div
                      className="px-2 py-0.5 rounded-lg bg-[#d97757] text-[#fffdf9] border border-[#b85a3b] font-mono font-extrabold text-[10px] tabular-nums shrink-0 shadow-xs"
                      title={`Target poin dari misi ini: +${goal.targetPoints}`}
                    >
                      {goal.targetPoints} PT
                    </div>
                  </div>

                  {/* Inner Framed Parchment Description Body */}
                  <div className="px-2.5 py-2 bg-[#fdfaf3]">
                    <p className="text-[11px] text-[#3d3732] leading-snug font-sans">
                      {goal.descriptionId || goal.description}
                    </p>
                  </div>

                  {/* Card Footer: Category Tag & Live Score Contribution */}
                  <div className="px-2.5 py-1.5 bg-[#f4efe6]/90 border-t border-[#e5dac6] flex items-center justify-between gap-2">
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
                      {scoreVal > 0 ? `+${scoreVal}` : scoreVal} Poin
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

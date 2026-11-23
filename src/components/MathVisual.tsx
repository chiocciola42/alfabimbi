import React, { useEffect, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { Eye } from 'lucide-react';
import type { MatchGroup, ShapeName, Visual } from '../math/types';

interface MathVisualProps {
  visual: Visual;
  /** Risposta scelta dal bambino: riempie la casella vuota delle serie. */
  answer?: string | number | null;
  /** True dopo aver risposto: la bilancia si equilibra, il telaio resta visibile. */
  answered?: boolean;
}

const FLASH_MS = 2500;

// ---------------------------------------------------------------------------
// Figure geometriche
// ---------------------------------------------------------------------------

function regularPolygon(sides: number, cx = 50, cy = 52, r = 42): string {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (-90 + (360 / sides) * i) * (Math.PI / 180);
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

export const ShapeSvg: React.FC<{ shape: ShapeName; color?: string; size?: number; label?: string }> = ({
  shape,
  color = '#f43f5e',
  size = 96,
  label,
}) => {
  const common = { fill: color, fillOpacity: 0.85, stroke: color, strokeWidth: 4, strokeLinejoin: 'round' as const };
  return (
    <span
      role="img"
      aria-label={label ?? shape}
      data-stage-prop="shape3d"
      data-stage-shape={shape}
      data-stage-color={color}
      className="inline-block"
      style={{ width: size, height: size }}
    >
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="stage-flat block">
      {shape === 'cerchio' && <circle cx="50" cy="50" r="40" {...common} />}
      {shape === 'quadrato' && <rect x="15" y="15" width="70" height="70" rx="3" {...common} />}
      {shape === 'rettangolo' && <rect x="4" y="25" width="92" height="50" rx="3" {...common} />}
      {shape === 'triangolo' && <polygon points="50,10 92,86 8,86" {...common} />}
      {shape === 'pentagono' && <polygon points={regularPolygon(5)} {...common} />}
      {shape === 'esagono' && <polygon points={regularPolygon(6, 50, 50, 42)} {...common} />}
    </svg>
    </span>
  );
};

// ---------------------------------------------------------------------------
// Telaio del 10
// ---------------------------------------------------------------------------

const TenFrameGrid: React.FC<{ filled: number; hidden?: boolean }> = ({ filled, hidden }) => (
  <div className="grid grid-cols-5 gap-1.5 p-2.5 bg-sky-100 border-2 border-sky-400 rounded-2xl">
    {Array.from({ length: 10 }, (_, i) => (
      <div
        key={i}
        className="w-14 h-14 rounded-xl bg-white border border-sky-300 flex items-center justify-center"
      >
        {!hidden && i < filled && (
          <span {...skin(undefined, 'ball')} className={`w-7 h-7 md:w-9 md:h-9 rounded-full shadow-sm ${i < 5 ? 'bg-rose-500' : 'bg-amber-400'}`} />
        )}
      </div>
    ))}
  </div>
);

const FlashTenFrame: React.FC<{ filled: number; flash: boolean; answered: boolean }> = ({ filled, flash, answered }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (!flash) return;
    const t = setTimeout(() => setVisible(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [filled, flash]);

  const replay = () => {
    setVisible(true);
    setTimeout(() => setVisible(false), FLASH_MS);
  };

  const hidden = flash && !visible && !answered;
  return (
    <div className="flex flex-col items-center gap-3">
      <TenFrameGrid filled={filled} hidden={hidden} />
      {flash && !answered && (
        <button
          type="button"
          onClick={replay}
          disabled={visible}
          className="flex items-center gap-1.5 px-3 py-1.5 min-h-14 text-xs font-bold rounded-xl bg-white border border-sky-300 text-sky-800 disabled:opacity-40 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          {visible ? 'Guarda bene…' : 'Rivedi i puntini'}
        </button>
      )}
    </div>
  );
};

interface TenFrameBuilderProps {
  cells: boolean[];
  onToggle: (index: number) => void;
  disabled?: boolean;
}

export const TenFrameBuilder: React.FC<TenFrameBuilderProps> = ({ cells, onToggle, disabled }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="grid grid-cols-5 gap-1.5 p-2.5 bg-sky-100 border-2 border-sky-400 rounded-2xl">
      {cells.map((on, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(i)}
          aria-label={`Casella ${i + 1}${on ? ', piena' : ', vuota'}`}
          aria-pressed={on}
          className="w-14 h-14 rounded-xl bg-white border border-sky-300 flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:cursor-default"
        >
          {on && <span {...skin(undefined, 'ball')} className={`w-7 h-7 md:w-9 md:h-9 rounded-full shadow-sm ${i < 5 ? 'bg-rose-500' : 'bg-amber-400'}`} />}
        </button>
      ))}
    </div>
    <span className="text-xs font-bold text-sky-800 tabular-nums">Puntini nel telaio: {cells.filter(Boolean).length}</span>
  </div>
);

interface TapOrderBoardProps {
  items: number[];
  tapped: number[];
  /** Lettera segreta sotto ogni numero: compare nella casella quando lo si tocca. */
  letters?: Record<number, string>;
  onTap: (value: number) => void;
  disabled?: boolean;
}

export const TapOrderBoard: React.FC<TapOrderBoardProps> = ({ items, tapped, letters, onTap, disabled }) => (
  <div className="flex flex-col items-center gap-4 w-full">
    <div className="flex flex-wrap items-center justify-center gap-3">
      {items.map((n) => {
        const position = tapped.indexOf(n);
        const done = position !== -1;
        return (
          <button
            {...skin()}
            key={n}
            type="button"
            disabled={disabled || done}
            onClick={() => onTap(n)}
            className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 text-2xl md:text-3xl font-black font-mono shadow-sm transition-all cursor-pointer active:scale-95 ${
              done ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200 hover:border-amber-400 text-slate-900'
            }`}
          >
            {n}
            {done && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center">
                {position + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
    <div className="flex items-center gap-2" aria-label="Numeri già toccati">
      {items.map((_, i) => (
        <div
          key={i}
          className={`w-14 h-14 rounded-xl border-2 border-dashed flex items-center justify-center text-lg font-black font-mono ${
            tapped[i] !== undefined ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'border-slate-300 text-slate-300'
          }`}
        >
          {tapped[i] !== undefined ? (letters?.[tapped[i]] ?? tapped[i]) : ''}
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Conta e scrivi: collega il numero alla quantità
// ---------------------------------------------------------------------------

interface MatchBoardProps {
  numbers: number[];
  groups: MatchGroup[];
  /** Numeri già collegati al gruppo giusto. */
  matched: number[];
  /** Numero scelto in attesa del suo gruppo. */
  selected: number | null;
  onPickNumber: (value: number) => void;
  onPickGroup: (value: number) => void;
  disabled?: boolean;
}

export const MatchBoard: React.FC<MatchBoardProps> = ({ numbers, groups, matched, selected, onPickNumber, onPickGroup, disabled }) => (
  <div className="flex items-stretch justify-center gap-4 sm:gap-10 w-full">
    <div className="flex flex-col justify-center gap-3" role="group" aria-label="Numeri">
      {numbers.map((n) => {
        const done = matched.includes(n);
        const active = selected === n;
        return (
          <button
            {...skin()}
            key={n}
            type="button"
            disabled={disabled || done}
            aria-pressed={active}
            aria-label={`Numero ${n}${done ? ', collegato' : ''}`}
            onClick={() => onPickNumber(n)}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 text-3xl font-black font-mono shadow-sm transition-all cursor-pointer active:scale-95 ${
              done
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                : active
                  ? 'bg-amber-100 border-amber-500 text-amber-900 ring-4 ring-amber-200'
                  : 'bg-white border-slate-300 hover:border-amber-400 text-slate-900'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
    <div className="flex flex-col justify-center gap-3" role="group" aria-label="Gruppi di oggetti">
      {groups.map((g) => {
        const done = matched.includes(g.value);
        return (
          <button
            key={g.value}
            type="button"
            disabled={disabled || done || selected === null}
            aria-label={`Gruppo di oggetti${done ? `: ${g.value}, collegato` : ''}`}
            onClick={() => onPickGroup(g.value)}
            className={`min-h-14 sm:min-h-20 w-44 sm:w-56 px-3 py-2 rounded-2xl border-2 flex flex-wrap items-center justify-center content-center gap-0.5 text-2xl leading-none shadow-sm transition-all cursor-pointer active:scale-95 ${
              done
                ? 'bg-emerald-100 border-emerald-400'
                : selected !== null
                  ? 'bg-white border-amber-400 hover:bg-amber-50'
                  : 'bg-white border-slate-300'
            }`}
          >
            {Array.from({ length: g.value }, (_, i) => (
              <span key={i}>{g.emoji}</span>
            ))}
          </button>
        );
      })}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Tessere del puzzle di Mateland
// ---------------------------------------------------------------------------

export const PuzzleStrip: React.FC<{ results: (boolean | null)[] }> = ({ results }) => {
  const unlocked = results.filter(Boolean).length;
  return (
    <div className="flex items-center justify-center gap-2" role="img" aria-label={`Tessere del puzzle sbloccate: ${unlocked} su ${results.length}`}>
      {results.map((r, i) => (
        <span
          key={i}
          className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-2xl transition-all ${
            r ? 'bg-indigo-100 border-indigo-400 scale-105' : 'bg-slate-100 border-dashed border-slate-300 grayscale opacity-60'
          }`}
        >
          🧩
        </span>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Somme passando dal 10
// ---------------------------------------------------------------------------

const MakeTen: React.FC<{ a: number; b: number; tool: 'frame' | 'line'; hide?: 'gap' | 'rest' | 'total' }> = ({ a, b, tool, hide }) => {
  const gap = 10 - a;
  const rest = b - gap;
  const sum = a + b;

  if (tool === 'frame') {
    const showBridge = hide !== 'gap';
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="grid grid-cols-5 gap-1.5 p-2.5 bg-sky-100 border-2 border-sky-400 rounded-2xl" aria-label={`Telaio con ${a} puntini`}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white border border-sky-300 flex items-center justify-center">
                {i < a && <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-rose-500 shadow-sm" />}
                {i >= a && showBridge && (
                  <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-300 border-2 border-dashed border-amber-600" />
                )}
              </div>
            ))}
          </div>
          <span className="text-3xl font-extrabold text-amber-500">+</span>
          <div className="flex flex-wrap justify-center gap-1.5 max-w-[190px] p-2 bg-white border-2 border-slate-200 rounded-2xl" aria-label={`${b} puntini`}>
            {Array.from({ length: b }, (_, i) => (
              <span
                key={i}
                className={`w-8 h-8 rounded-full ${
                  i < gap && showBridge ? 'bg-amber-300 border-2 border-dashed border-amber-600' : 'bg-sky-500'
                } shadow-sm`}
              />
            ))}
          </div>
        </div>
        <span className="text-lg font-black text-slate-700 tabular-nums">
          {a} + {b}
        </span>
      </div>
    );
  }

  const cells = Array.from({ length: b + 1 }, (_, i) => a + i);
  const gapLabel = hide === 'gap' ? '+ ?' : `+ ${gap}`;
  const restLabel = hide === 'rest' ? '+ ?' : `+ ${rest}`;
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map((n, i) => {
          const isStart = n === a;
          const isTen = n === 10;
          const isEnd = i === cells.length - 1;
          return (
            <div key={n} className="flex flex-col items-center gap-1">
              <span className="h-5 text-[11px] font-black text-indigo-700 whitespace-nowrap">
                {isTen ? restLabel : isStart ? gapLabel : ''}
              </span>
              <div
                className={`w-full max-w-9 aspect-square rounded-full flex items-center justify-center text-[11px] sm:text-sm font-black border-2 ${
                  isStart
                    ? 'bg-rose-500 border-rose-600 text-white'
                    : isTen
                      ? 'bg-amber-300 border-amber-600 text-amber-950'
                      : isEnd
                        ? 'bg-sky-100 border-dashed border-sky-500 text-sky-900'
                        : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                {isEnd && hide === 'total' ? '?' : n}
              </div>
            </div>
          );
        })}
      </div>
      <span className="text-lg font-black text-slate-700 tabular-nums">
        {a} + {b} {hide === 'total' ? '= ?' : `= ${sum}`}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bilancia
// ---------------------------------------------------------------------------

const Pan: React.FC<{ items: string[]; missing?: boolean; answered?: boolean }> = ({ items, missing, answered }) => (
  <div className="flex flex-col items-center">
    <div className="min-h-[88px] w-32 md:w-44 flex flex-wrap items-end justify-center content-end gap-0.5 pb-1">
      {items.map((e, i) => (
        <span key={i} className="text-2xl md:text-3xl leading-none">
          {e}
        </span>
      ))}
      {missing && (
        <span
          className={`w-9 h-9 rounded-lg border-2 border-dashed flex items-center justify-center text-lg font-black ${
            answered ? 'border-emerald-400 text-emerald-600' : 'border-amber-400 text-amber-600'
          }`}
        >
          ?
        </span>
      )}
    </div>
    <div className="h-2.5 w-32 md:w-44 rounded-b-full bg-slate-500" />
  </div>
);

const Balance: React.FC<{
  left: string[];
  right: string[];
  rightMissing?: boolean;
  tilt: 'left' | 'right' | 'level';
  answered: boolean;
}> = ({ left, right, rightMissing, tilt, answered }) => {
  const effective = answered && rightMissing ? 'level' : tilt;
  const drop = 11;
  const leftDrop = effective === 'left' ? drop : 0;
  const rightDrop = effective === 'right' ? drop : 0;
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-start justify-between w-full max-w-lg">
        <div className="transition-transform duration-500" style={{ transform: `translateY(${leftDrop}px)` }}>
          <Pan items={left} />
        </div>
        <div className="transition-transform duration-500" style={{ transform: `translateY(${rightDrop}px)` }}>
          <Pan items={right} missing={rightMissing} answered={answered} />
        </div>
      </div>
      <div className="relative w-full max-w-lg h-24 -mt-5">
        <div
          {...skin()}
          className="absolute left-[8%] right-[8%] top-3 h-1.5 rounded-full bg-slate-500 transition-transform duration-500"
          style={{ transform: `rotate(${effective === 'left' ? -3 : effective === 'right' ? 3 : 0}deg)` }}
          aria-hidden="true"
        />
        <div className="absolute left-1/2 -translate-x-1/2 top-3 text-slate-600 text-3xl select-none" aria-hidden="true">
          🔺
        </div>
        <div {...skin()} className="absolute left-1/2 -translate-x-1/2 bottom-0 w-24 h-3 rounded-full bg-slate-400" />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Orologio
// ---------------------------------------------------------------------------

const Clock: React.FC<{ hour: number; minute: 0 | 30 }> = ({ hour, minute }) => {
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;
  return (
    <div
      role="img"
      aria-label="Orologio analogico"
      data-stage-prop="clock3d"
      data-stage-hour={hour % 12 === 0 ? 12 : hour % 12}
      data-stage-minute={minute}
      className="w-[180px] h-[180px]"
    >
    <svg viewBox="0 0 120 120" width="180" height="180" aria-hidden="true" className="stage-flat">
      <circle cx="60" cy="60" r="56" fill="#fff" stroke="#f59e0b" strokeWidth="5" />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 - 90) * (Math.PI / 180);
        return (
          <text
            key={n}
            x={60 + 44 * Math.cos(a)}
            y={60 + 44 * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="800"
            fill="#334155"
          >
            {n}
          </text>
        );
      })}
      <line x1="60" y1="60" x2="60" y2="33" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" transform={`rotate(${hourAngle} 60 60)`} />
      <line x1="60" y1="60" x2="60" y2="18" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" transform={`rotate(${minuteAngle} 60 60)`} />
      <circle cx="60" cy="60" r="4" fill="#0f172a" />
    </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Monete
// ---------------------------------------------------------------------------

const COIN_STYLE: Record<number, string> = {
  1: 'bg-slate-200 border-slate-400 text-slate-700 w-12 h-12',
  2: 'bg-amber-200 border-amber-500 text-amber-900 w-14 h-14',
  5: 'bg-emerald-200 border-emerald-500 text-emerald-900 w-16 h-16',
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export const MathVisual: React.FC<MathVisualProps> = ({ visual, answer = null, answered = false }) => {
  switch (visual.kind) {
    case 'ten_frame':
      return <FlashTenFrame filled={visual.filled} flash={!!visual.flash} answered={answered} />;

    case 'shape':
      return <ShapeSvg shape={visual.shape} color={visual.color} size={128} />;

    case 'shape_row':
      return (
        <div className="flex flex-wrap items-end justify-center gap-4">
          {visual.shapes.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <ShapeSvg shape={s} color={visual.colors?.[i]} size={72} />
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      );

    case 'pattern':
      return (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {visual.items.map((symbol, i) => {
            const isMissing = i === visual.missingIndex;
            return (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl md:text-3xl border-2 ${
                  isMissing ? 'border-dashed border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
                }`}
              >
                {isMissing ? (answer !== null ? answer : '❓') : symbol}
              </div>
            );
          })}
        </div>
      );

    case 'sequence':
      return (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {visual.numbers.map((n, i) => (
            <div
              key={i}
              className={`w-12 h-14 md:w-14 md:h-16 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black font-mono border-2 ${
                n === null ? 'border-dashed border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              {n === null ? (answer !== null ? answer : '?') : n}
            </div>
          ))}
        </div>
      );

    case 'balance':
      return (
        <Balance
          left={visual.left}
          right={visual.right}
          rightMissing={visual.rightMissing}
          tilt={visual.tilt ?? 'level'}
          answered={answered}
        />
      );

    case 'bars':
      return (
        <div className="w-full max-w-md space-y-2.5">
          {visual.bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="w-14 text-xs font-bold text-slate-600 text-right">{b.label}</span>
              <div className="flex-1 flex bg-slate-100 rounded-lg overflow-hidden h-9" aria-label={`${b.label}: ${b.length} quadretti`}>
                {Array.from({ length: b.length }, (_, i) => (
                  <span key={i} className="flex-1 flex items-center justify-center text-lg leading-none" style={{ maxWidth: '10%' }}>
                    {b.emoji}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case 'pairs': {
      const pairCount = Math.floor(visual.count / 2);
      const lone = visual.count % 2 === 1;
      return (
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
          {Array.from({ length: pairCount }, (_, i) => (
            <div key={i} className="flex gap-0.5 px-2 py-1 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-2xl">
              <span>{visual.emoji}</span>
              <span>{visual.emoji}</span>
            </div>
          ))}
          {lone && (
            <div className="flex gap-0.5 px-2 py-1 bg-rose-50 border-2 border-dashed border-rose-300 rounded-xl text-2xl">
              <span>{visual.emoji}</span>
              <span className="w-[1.5rem]" />
            </div>
          )}
        </div>
      );
    }

    case 'grid':
      return (
        <div
          className="grid gap-1.5 p-2 bg-white border-2 border-slate-200 rounded-2xl"
          style={{ gridTemplateColumns: `repeat(${visual.cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: visual.rows * visual.cols }, (_, idx) => {
            const row = Math.floor(idx / visual.cols);
            const col = idx % visual.cols;
            const item = visual.items.find((it) => it.row === row && it.col === col);
            const marked = visual.markCell?.row === row && visual.markCell?.col === col;
            return (
              <div
                key={idx}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl border ${
                  marked ? 'bg-amber-100 border-amber-400' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {item?.emoji}
              </div>
            );
          })}
        </div>
      );

    case 'clock':
      return <Clock hour={visual.hour} minute={visual.minute} />;

    case 'coins':
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {visual.coins.map((c, i) => (
            <div
              key={i}
              {...skin()}
              className={`rounded-full border-4 flex items-center justify-center font-black shadow-sm ${COIN_STYLE[c] ?? COIN_STYLE[1]}`}
            >
              {c}€
            </div>
          ))}
        </div>
      );

    case 'make_ten':
      return <MakeTen a={visual.a} b={visual.b} tool={visual.tool} hide={visual.hide} />;

    case 'groups':
      return (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {Array.from({ length: visual.groups }, (_, g) => (
            <div key={g} className="px-3 py-2 bg-amber-50 border-2 border-amber-300 rounded-2xl text-center">
              <div className="flex flex-wrap justify-center gap-0.5 max-w-[110px] text-xl">
                {Array.from({ length: visual.perGroup }, (_, i) => (
                  <span key={i}>{visual.emoji}</span>
                ))}
              </div>
              <span className="text-[10px] font-bold text-amber-700">cestino {g + 1}</span>
            </div>
          ))}
        </div>
      );
  }
};

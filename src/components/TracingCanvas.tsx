import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LetterData, StrokeGuide } from '../types';
import { sound } from '../utils/sound';
import { RotateCcw, Play, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Volume2 } from 'lucide-react';

interface TracingCanvasProps {
  letter: LetterData;
  onLetterComplete: (letterId: string, isUppercase: boolean) => void;
  onNextLetter?: () => void;
  onPrevLetter?: () => void;
  isCompletedUppercase: boolean;
  isCompletedLowercase: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const TracingCanvas: React.FC<TracingCanvasProps> = ({
  letter,
  onLetterComplete,
  onNextLetter,
  onPrevLetter,
  isCompletedUppercase,
  isCompletedLowercase,
}) => {
  const [isUppercase, setIsUppercase] = useState<boolean>(true);
  const [selectedColor, setSelectedColor] = useState<string>('rainbow');
  const [brushSize, setBrushSize] = useState<number>(26);
  const [completionPercent, setCompletionPercent] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [demoPoint, setDemoPoint] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const userStrokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  // Set once the 75% threshold has been reported for the current attempt; drawing stays possible afterwards.
  const completedRef = useRef<boolean>(false);

  const currentStrokes: StrokeGuide[] = isUppercase
    ? letter.strokesUppercase
    : letter.strokesLowercase;

  const currentDisplayLetter = isUppercase ? letter.letter : letter.lowercase;

  // Color options
  const colorPalette = [
    { id: 'rainbow', label: 'Magico', gradient: 'from-pink-400 via-yellow-400 to-cyan-400', hex: '#ec4899' },
    { id: '#F59E0B', label: 'Oro', gradient: 'bg-amber-400', hex: '#F59E0B' },
    { id: '#EC4899', label: 'Rosa', gradient: 'bg-pink-500', hex: '#EC4899' },
    { id: '#06B6D4', label: 'Azzurro', gradient: 'bg-cyan-500', hex: '#06B6D4' },
    { id: '#10B981', label: 'Smeraldo', gradient: 'bg-emerald-500', hex: '#10B981' },
    { id: '#8B5CF6', label: 'Viola', gradient: 'bg-purple-500', hex: '#8B5CF6' },
  ];

  // Reset drawing when letter or case changes
  useEffect(() => {
    clearCanvas();
    setIsComplete(false);
    setCompletionPercent(0);
    sound.speak(`Ora impariamo a scrivere la lettera ${currentDisplayLetter}!`);
  }, [letter.id, isUppercase]);

  // Particle animation loop
  useEffect(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    if (!ctx) return;

    const renderParticles = () => {
      ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      const remaining: Particle[] = [];

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.size *= 0.96;

        if (p.alpha > 0 && p.size > 0.5) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle star cross
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(p.x - p.size * 1.5, p.y);
          ctx.lineTo(p.x + p.size * 1.5, p.y);
          ctx.moveTo(p.x, p.y - p.size * 1.5);
          ctx.lineTo(p.x, p.y + p.size * 1.5);
          ctx.stroke();

          ctx.restore();
          remaining.push(p);
        }
      }

      particlesRef.current = remaining;
      animationFrameRef.current = requestAnimationFrame(renderParticles);
    };

    animationFrameRef.current = requestAnimationFrame(renderParticles);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Resize canvas according to display resolution
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const pCanvas = particleCanvasRef.current;
      if (!canvas || !pCanvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      pCanvas.width = rect.width * dpr;
      pCanvas.height = rect.height * dpr;

      redrawAllStrokes();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const spawnSparkles = (x: number, y: number, color: string) => {
    const count = 4;
    const colors = ['#F59E0B', '#EC4899', '#06B6D4', '#10B981', '#ffffff', '#FDE047'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: color === 'rainbow' ? colors[Math.floor(Math.random() * colors.length)] : color,
        alpha: 1,
      });
    }
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };
  };

  const getStrokeColor = (index: number) => {
    if (selectedColor === 'rainbow') {
      const rainbowSteps = ['#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6'];
      return rainbowSteps[index % rainbowSteps.length];
    }
    return selectedColor;
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    userStrokesRef.current.push([coords]);

    spawnSparkles(coords.x, coords.y, selectedColor);
    sound.playClick();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    const dpr = window.devicePixelRatio || 1;
    const currentStroke = userStrokesRef.current[userStrokesRef.current.length - 1];
    if (currentStroke) {
      currentStroke.push(coords);
    }

    const strokeColor = getStrokeColor(userStrokesRef.current.length);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = brushSize * dpr;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Subtle shiny inner core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, (brushSize * dpr) / 4);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    spawnSparkles(coords.x, coords.y, strokeColor);
    lastPointRef.current = coords;

    // Check progress
    evaluateProgress();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
    evaluateProgress(true);
  };

  const redrawAllStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    userStrokesRef.current.forEach((stroke, strokeIdx) => {
      if (stroke.length < 2) return;
      const strokeColor = getStrokeColor(strokeIdx);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize * dpr;

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();

      // Shiny core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, (brushSize * dpr) / 4);
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  };

  const clearCanvas = () => {
    userStrokesRef.current = [];
    completedRef.current = false;
    setCompletionPercent(0);
    setIsComplete(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    sound.playClick();
  };

  // Evaluate how closely user strokes hit guide checkpoints
  const evaluateProgress = useCallback((isFinalCheck: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;

    // Build checkpoints along each stroke guide
    const checkpoints: Array<{ x: number; y: number }> = [];

    currentStrokes.forEach((stroke) => {
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const x1 = (p1.x / 100) * width;
        const y1 = (p1.y / 100) * height;
        const x2 = (p2.x / 100) * width;
        const y2 = (p2.y / 100) * height;

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(4, Math.floor(dist / (24 * dpr)));

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          checkpoints.push({
            x: x1 + (x2 - x1) * t,
            y: y1 + (y2 - y1) * t,
          });
        }
      }
    });

    if (checkpoints.length === 0) return;

    // Tolerance radius (friendly for little children fingers)
    const hitRadius = (brushSize + 18) * dpr;
    let hitCount = 0;

    checkpoints.forEach((cp) => {
      let isHit = false;
      for (const stroke of userStrokesRef.current) {
        for (const pt of stroke) {
          const d = Math.hypot(pt.x - cp.x, pt.y - cp.y);
          if (d <= hitRadius) {
            isHit = true;
            break;
          }
        }
        if (isHit) break;
      }
      if (isHit) hitCount++;
    });

    const percent = Math.min(100, Math.round((hitCount / checkpoints.length) * 100));
    setCompletionPercent(percent);

    if (percent >= 75 && !completedRef.current) {
      completedRef.current = true;
      setIsComplete(true);
      onLetterComplete(letter.id, isUppercase);
    }
  }, [currentStrokes, brushSize, letter.id, isUppercase, onLetterComplete]);

  // Demo animation showing step by step stroke demonstration
  const playDemo = async () => {
    if (isDemoPlaying) return;
    setIsDemoPlaying(true);
    sound.speak(`Guarda come si scrive la lettera ${currentDisplayLetter}!`);

    for (const stroke of currentStrokes) {
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const steps = 30;

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const currentX = p1.x + (p2.x - p1.x) * t;
          const currentY = p1.y + (p2.y - p1.y) * t;
          setDemoPoint({ x: currentX, y: currentY });
          await new Promise((r) => setTimeout(r, 22));
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    setDemoPoint(null);
    setIsDemoPlaying(false);
  };

  const isCurrentFinished = isUppercase ? isCompletedUppercase : isCompletedLowercase;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Bar for Letter Navigation & Case Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          {onPrevLetter && (
            <button
              onClick={onPrevLetter}
              className="p-2.5 rounded-2xl bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Lettera precedente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-amber-200 shadow-xs">
            <span className="text-3xl leading-none">{letter.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-amber-950 tracking-tight">
                  {currentDisplayLetter}
                </span>
                <span className="text-sm font-semibold text-amber-700">
                  come {letter.word}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isUppercase ? 'Lettera Maiuscola' : 'Lettera minuscola'}
              </span>
            </div>
            <button
              onClick={() => sound.speakLetter(letter.letter, letter.word)}
              className="p-1.5 ml-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
              title="Ascolta pronuncia"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {onNextLetter && (
            <button
              onClick={onNextLetter}
              className="p-2.5 rounded-2xl bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Lettera successiva"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Case Toggle: MAIUSCOLO / minuscolo */}
        <div className="flex items-center bg-amber-100/80 p-1 rounded-2xl border border-amber-200">
          <button
            onClick={() => {
              setIsUppercase(true);
              sound.playClick();
            }}
            className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              isUppercase
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-900 hover:text-amber-950'
            }`}
          >
            MAIUSCOLO (A)
          </button>
          <button
            onClick={() => {
              setIsUppercase(false);
              sound.playClick();
            }}
            className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              !isUppercase
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-900 hover:text-amber-950'
            }`}
          >
            minuscolo (a)
          </button>
        </div>
      </div>

      {/* Main Tracing Stage */}
      <div className="relative bg-white rounded-3xl border-2 border-amber-200 shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left: Interactive Canvas Area */}
        <div className="relative flex-1 min-h-[420px] sm:min-h-[480px] bg-[radial-gradient(#fde68a_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center p-2 pb-14 sm:p-4 sm:pb-14 select-none touch-none">
          {/* Guide Letter SVG Layer in Background */}
          {/*
            Square drawing stage: the guide SVG (0-100 viewBox), the drawing canvas and the demo hand
            share the same box, so the strokes the child must follow are exactly the ones that are
            scored (the guide used to be centred in a smaller box than the canvas).
          */}
          <div className="relative w-full max-w-[440px] aspect-square" data-testid="tracing-stage">
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full p-0"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Reference dashed baseline guide */}
              <line x1="10" y1="85" x2="90" y2="85" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="10" y1="15" x2="90" y2="15" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="3 3" />

              {/* Guide Stroke Paths */}
              {currentStrokes.map((stroke, sIdx) => {
                const pathData = stroke.points
                  .map((p, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');

                return (
                  <g key={stroke.id}>
                    {/* Thick soft background track */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#FEF3C7"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Dashed center line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="3 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Numbered Step Circle at start */}
                    <circle
                      cx={stroke.points[0].x}
                      cy={stroke.points[0].y}
                      r="4"
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                    />
                    <text
                      x={stroke.points[0].x}
                      y={stroke.points[0].y + 1.2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontSize="3.8"
                      fontWeight="bold"
                    >
                      {stroke.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* User Drawing Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
          />

          {/* Sparkles Overlay Canvas */}
          <canvas
            ref={particleCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* Demo Hand Indicator if Demo is Running */}
          {demoPoint && (
            <div
              className="absolute pointer-events-none z-30 transition-all duration-75 text-3xl -ml-2 -mt-4 animate-bounce"
              style={{
                left: `${demoPoint.x}%`,
                top: `${demoPoint.y}%`,
              }}
            >
              ✍️
            </div>
          )}
          </div>

          {/* Bottom helper prompt on canvas */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-amber-800/80 pointer-events-none z-20">
            <span className="font-semibold bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-amber-200">
              Segui i numeri 1, 2, 3 con il ditino o il mouse!
            </span>
            <span className="font-bold tabular-nums bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-300 text-amber-900">
              Completato: {completionPercent}%
            </span>
          </div>
        </div>

        {/* Right Sidebar: Tools & Cheerful Controls */}
        <div className="w-full md:w-64 bg-amber-50/60 p-4 border-t md:border-t-0 md:border-l border-amber-200 flex flex-col justify-between gap-4">
          <div>
            <h4 className="font-bold text-amber-950 text-sm mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Colore Magico
            </h4>

            {/* Colors Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {colorPalette.map((col) => {
                const isSelected = selectedColor === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      setSelectedColor(col.id);
                      sound.playSparkle();
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-white shadow-xs scale-102 ring-2 ring-amber-300'
                        : 'border-amber-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full ${
                        col.id === 'rainbow' ? 'bg-gradient-to-tr ' + col.gradient : ''
                      }`}
                      style={col.id !== 'rainbow' ? { backgroundColor: col.hex } : {}}
                    />
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Brush Size Slider */}
            <div className="mb-4 bg-white/80 p-3 rounded-2xl border border-amber-200">
              <div className="flex justify-between items-center text-xs font-bold text-amber-900 mb-1.5">
                <span>Spessore Pennarello</span>
                <span className="tabular-nums">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="36"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={playDemo}
                disabled={isDemoPlaying}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm rounded-xl border border-amber-300 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span>Mostrami come fare</span>
              </button>

              <button
                onClick={clearCanvas}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-sm rounded-xl border border-slate-200 hover:border-rose-200 shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ricomincia</span>
              </button>
            </div>
          </div>

          {/* Letter Completion Status Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 text-center">
            {isComplete || isCurrentFinished ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Lettera Completata!</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Bravissima! Hai guadagnato 5 stelle d'oro! ⭐
                </p>
                {onNextLetter && (
                  <button
                    onClick={onNextLetter}
                    className="w-full py-2 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Prossima Lettera &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-amber-800 block mb-1">
                  Obiettivo Scrittura
                </span>
                <div className="w-full bg-amber-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-amber-700/80 mt-1 block">
                  Traccia tutte le linee per sbloccare il premio!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

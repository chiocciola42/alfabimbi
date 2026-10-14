import React, { useState } from 'react';
import { sound } from '../utils/sound';
import { Volume2, RotateCcw, Plus, Minus, Sparkles } from 'lucide-react';
import { MathVisual } from './MathVisual';

export const MathLab: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'abacus' | 'line' | 'ten_frame' | 'coins' | 'rekenrek' | 'balance'>('abacus');

  // Rekenrek: due file da 10 perline, quante sono spostate a sinistra
  const [rekenrek, setRekenrek] = useState<[number, number]>([7, 3]);

  // Bilancia libera
  const [panLeft, setPanLeft] = useState<number>(5);
  const [panRight, setPanRight] = useState<number>(3);

  // Abacus state
  const [tensBeads, setTensBeads] = useState<number>(1);
  const [unitsBeads, setUnitsBeads] = useState<number>(4);

  // Number line state
  const [frogPos, setFrogPos] = useState<number>(5);

  // 10-frame state (10 boolean slots)
  const [tenFrameCount, setTenFrameCount] = useState<number>(7);

  // Coins purse state
  const [coins1, setCoins1] = useState<number>(2);
  const [coins2, setCoins2] = useState<number>(2);
  const [coins5, setCoins5] = useState<number>(1);

  // Audio explanations
  const speakAbacus = () => {
    const total = tensBeads * 10 + unitsBeads;
    const text = `${tensBeads} decine e ${unitsBeads} unità formano il numero ${total}!`;
    sound.speak(text);
  };

  const speakFrog = () => {
    const text = `La ranocchia si trova sul numero ${frogPos}!`;
    sound.speak(text);
  };

  const speakTenFrame = () => {
    const yellow = tenFrameCount;
    const purple = 10 - tenFrameCount;
    const text = `${yellow} più ${purple} fa 10! Sono amici del 10!`;
    sound.speak(text);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-300 text-amber-950 rounded-3xl p-6 md:p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950/80">
            <Sparkles className="w-4 h-4 text-amber-900" />
            <span>Laboratorio Matematico Libero</span>
            <span aria-hidden="true">·</span>
            <span>Senza Punteggio né Fretta</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Palestra dei Manipolativi 🧮
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-xl">
            Tocca, aggiungi e sperimenta con l'abaco, la linea dei numeri, gli amici del 10 e le monetine!
          </p>
        </div>

        {/* Tool selector buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/80 backdrop-blur-xs rounded-xl border-2 border-white/60">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('abacus');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'abacus' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧮 L'Abaco
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('line');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'line' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🐸 Linea Numeri
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('ten_frame');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'ten_frame' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔟 Amici del 10
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('coins');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'coins' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🪙 Il Mercatino
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('rekenrek');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'rekenrek' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📿 Rekenrek
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTool('balance');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTool === 'balance' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚖️ Bilancia
          </button>
        </div>
      </div>

      {/* TOOL 1: L'Abaco Magico */}
      {activeTool === 'abacus' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                L'Abaco delle Decine e Unità
              </h2>
              <p className="text-xs text-slate-500">
                Aggiungi o togli palline rosse per le decine (da) e palline blu per le unità (u).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={speakAbacus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Ascolta Numero</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setTensBeads(1);
                  setUnitsBeads(0);
                }}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Azzera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Abacus Visualizer */}
          <div className="bg-amber-50/60 border-2 border-amber-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-center gap-12">
            
            {/* The Wooden Abacus Frame */}
            <div className="bg-amber-100 border-4 border-amber-600/70 rounded-3xl p-6 shadow-md flex items-end gap-12">
              
              {/* Tens Rod */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-extrabold text-rose-600 mb-2">da (decine)</span>
                
                <div className="w-4 h-48 bg-amber-400 rounded-full flex flex-col-reverse items-center justify-start p-1 gap-1.5 border border-amber-500 shadow-inner">
                  {Array.from({ length: tensBeads }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-7 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 border-2 border-rose-700 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      onClick={() => {
                        sound.playPop();
                        setTensBeads((prev) => Math.max(0, prev - 1));
                      }}
                      title="Tocca per togliere"
                    />
                  ))}
                </div>

                {/* Rod Controls */}
                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={() => {
                      sound.playPop();
                      setTensBeads((p) => Math.max(0, p - 1));
                    }}
                    disabled={tensBeads === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-black text-rose-600 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{tensBeads}</span>
                  <button
                    onClick={() => {
                      sound.playPop();
                      setTensBeads((p) => Math.min(9, p + 1));
                    }}
                    disabled={tensBeads >= 9}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-black text-rose-600 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Units Rod */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-extrabold text-blue-600 mb-2">u (unità)</span>
                
                <div className="w-4 h-48 bg-amber-400 rounded-full flex flex-col-reverse items-center justify-start p-1 gap-1.5 border border-amber-500 shadow-inner">
                  {Array.from({ length: unitsBeads }).map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-700 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      onClick={() => {
                        sound.playPop();
                        setUnitsBeads((prev) => Math.max(0, prev - 1));
                      }}
                      title="Tocca per togliere"
                    />
                  ))}
                </div>

                {/* Rod Controls */}
                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={() => {
                      sound.playPop();
                      setUnitsBeads((p) => Math.max(0, p - 1));
                    }}
                    disabled={unitsBeads === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-black text-blue-600 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{unitsBeads}</span>
                  <button
                    onClick={() => {
                      sound.playPop();
                      setUnitsBeads((p) => Math.min(9, p + 1));
                    }}
                    disabled={unitsBeads >= 9}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-black text-blue-600 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Readout Result card */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 text-center space-y-3 min-w-[200px] shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Numero Formato
              </span>
              <div className="text-6xl font-black text-slate-900">
                {tensBeads * 10 + unitsBeads}
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="text-xs font-semibold text-rose-600">
                  {tensBeads} decine = {tensBeads * 10}
                </div>
                <div className="text-xs font-semibold text-blue-600">
                  {unitsBeads} unità = {unitsBeads}
                </div>
                <div className="text-sm font-extrabold text-slate-800 pt-1">
                  {tensBeads * 10} + {unitsBeads} = {tensBeads * 10 + unitsBeads}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 2: La Linea dei Numeri Interattiva */}
      {activeTool === 'line' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                La Linea dei Numeri da 0 a 20 con la Rana 🐸
              </h2>
              <p className="text-xs text-slate-500">
                Fai saltare la ranocchia avanti o indietro per scoprire le addizioni e sottrazioni!
              </p>
            </div>

            <button
              onClick={speakFrog}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Ascolta Posizione</span>
            </button>
          </div>

          {/* Number line graphical path */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 overflow-x-auto space-y-8">
            <div className="min-w-[650px] relative pt-8 pb-4 border-b-4 border-emerald-500 flex justify-between px-2">
              {Array.from({ length: 21 }, (_, n) => {
                const isFrogHere = frogPos === n;
                return (
                  <button
                    key={n}
                    onClick={() => {
                      sound.playPop();
                      setFrogPos(n);
                    }}
                    className="flex flex-col items-center relative cursor-pointer group"
                  >
                    {isFrogHere && (
                      <div className="absolute -top-11 text-4xl animate-bounce">
                        🐸
                      </div>
                    )}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform ${
                        isFrogHere
                          ? 'bg-emerald-600 text-white shadow-md scale-125'
                          : 'bg-white border border-slate-300 text-slate-700 group-hover:border-emerald-400 group-hover:scale-110'
                      }`}
                    >
                      {n}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Jumping Buttons */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  sound.playPop();
                  setFrogPos((p) => Math.max(0, p - 5));
                }}
                disabled={frogPos < 5}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ⬅️ Salto -5
              </button>
              <button
                onClick={() => {
                  sound.playPop();
                  setFrogPos((p) => Math.max(0, p - 1));
                }}
                disabled={frogPos === 0}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ⬅️ Salto -1
              </button>
              
              <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-extrabold shadow-xs">
                Sasso Attuale: {frogPos}
              </div>

              <button
                onClick={() => {
                  sound.playPop();
                  setFrogPos((p) => Math.min(20, p + 1));
                }}
                disabled={frogPos >= 20}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Salto +1 ➡️
              </button>
              <button
                onClick={() => {
                  sound.playPop();
                  setFrogPos((p) => Math.min(20, p + 5));
                }}
                disabled={frogPos > 15}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Salto +5 ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 3: Amici del 10 Grid (2x5 box) */}
      {activeTool === 'ten_frame' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                La Griglia degli Amici del 10
              </h2>
              <p className="text-xs text-slate-500">
                Guarda come due numeri si uniscono per formare il magico 10!
              </p>
            </div>

            <button
              onClick={speakTenFrame}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-100 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Ascolta Coppia</span>
            </button>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex flex-col items-center justify-center space-y-6">
            
            {/* 10-Frame (2 rows of 5 boxes) */}
            <div className="bg-white border-4 border-slate-800 rounded-2xl p-3 shadow-md grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => {
                const isYellow = i < tenFrameCount;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      sound.playPop();
                      setTenFrameCount(i + 1);
                    }}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer transform active:scale-95 ${
                      isYellow
                        ? 'bg-amber-400 border-amber-500 shadow-md text-amber-900'
                        : 'bg-purple-400 border-purple-500 shadow-md text-purple-900'
                    }`}
                  >
                    <span className="text-2xl font-black">
                      {isYellow ? '🟡' : '🟣'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Formula formula */}
            <div className="flex items-center gap-3 text-2xl md:text-3xl font-black text-slate-900">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                {tenFrameCount}
              </span>
              <span className="text-slate-400">+</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-xl border border-purple-300">
                {10 - tenFrameCount}
              </span>
              <span className="text-slate-400">=</span>
              <span className="px-4 py-1 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
                10
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500 text-center">
              Tocca una casella qualsiasi per cambiare il punto di divisione tra i due colori!
            </p>
          </div>
        </div>
      )}

      {/* TOOL 4: Il Mercatino delle Monetine */}
      {activeTool === 'coins' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Il Mercatino & Il Portamonete 🪙
              </h2>
              <p className="text-xs text-slate-500">
                Metti le monete da 1€, 2€ e la banconota da 5€ nel portamonete e conta il totale!
              </p>
            </div>

            <button
              onClick={() => {
                const total = coins1 * 1 + coins2 * 2 + coins5 * 5;
                sound.speak(`Nel portamonete ci sono ${total} euro in totale!`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-bold rounded-xl hover:bg-yellow-100 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Ascolta Totale</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1 Euro box */}
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-2xl p-4 text-center space-y-3">
              <span className="text-4xl block">🪙</span>
              <h3 className="text-sm font-bold text-slate-900">Moneta da 1€</h3>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    sound.playPop();
                    setCoins1((c) => Math.max(0, c - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  -
                </button>
                <span className="text-lg font-black w-6">{coins1}</span>
                <button
                  onClick={() => {
                    sound.playStarDing();
                    setCoins1((c) => Math.min(10, c + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs font-semibold text-yellow-800 block">
                Valore: {coins1 * 1}€
              </span>
            </div>

            {/* 2 Euro box */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center space-y-3">
              <span className="text-4xl block">🥈</span>
              <h3 className="text-sm font-bold text-slate-900">Moneta da 2€</h3>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    sound.playPop();
                    setCoins2((c) => Math.max(0, c - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  -
                </button>
                <span className="text-lg font-black w-6">{coins2}</span>
                <button
                  onClick={() => {
                    sound.playStarDing();
                    setCoins2((c) => Math.min(10, c + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs font-semibold text-amber-800 block">
                Valore: {coins2 * 2}€
              </span>
            </div>

            {/* 5 Euro box */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center space-y-3">
              <span className="text-4xl block">💵</span>
              <h3 className="text-sm font-bold text-slate-900">Banconota da 5€</h3>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    sound.playPop();
                    setCoins5((c) => Math.max(0, c - 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  -
                </button>
                <span className="text-lg font-black w-6">{coins5}</span>
                <button
                  onClick={() => {
                    sound.playStarDing();
                    setCoins5((c) => Math.min(5, c + 1));
                  }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs font-semibold text-emerald-800 block">
                Valore: {coins5 * 5}€
              </span>
            </div>
          </div>

          {/* Total Purse banner */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-2">
              <span>👛 Totale nel Portamonete:</span>
            </span>
            <span className="text-2xl font-black text-amber-400">
              {coins1 * 1 + coins2 * 2 + coins5 * 5} €
            </span>
          </div>
        </div>
      )}
      {/* TOOL 5: Rekenrek */}
      {activeTool === 'rekenrek' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Il Rekenrek: due file di perline</h2>
            <p className="text-xs text-slate-500">
              Tocca una perlina per spostare la fila fino a lì. Cinque rosse e cinque bianche: vedi subito i gruppi da 5 e da 10!
            </p>
          </div>
          <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 space-y-4">
            {rekenrek.map((count, row) => (
              <div key={row} className="flex items-center gap-2">
                <div className="flex-1 relative flex items-center h-12 bg-white rounded-2xl border-2 border-slate-300 px-2">
                  <div className="absolute left-3 right-3 top-1/2 h-1 bg-slate-300 rounded-full" aria-hidden="true" />
                  {Array.from({ length: 10 }, (_, i) => (
                    <React.Fragment key={i}>
                      {i === count && <div className="flex-1" aria-hidden="true" />}
                      <button
                        aria-label={`Fila ${row + 1}, perlina ${i + 1}`}
                        onClick={() => {
                          sound.playPop();
                          setRekenrek((prev) => {
                            const next: [number, number] = [prev[0], prev[1]];
                            next[row] = prev[row] === i + 1 ? i : i + 1;
                            return next;
                          });
                        }}
                        className={`relative z-10 w-7 h-7 md:w-9 md:h-9 rounded-full border-2 shadow-sm cursor-pointer active:scale-95 ${
                          i < 5 ? 'bg-rose-500 border-rose-700' : 'bg-white border-slate-400'
                        } ${i < count ? '' : 'opacity-60'}`}
                      />
                    </React.Fragment>
                  ))}
                  {count === 10 && <div className="flex-1" aria-hidden="true" />}
                </div>
                <span className="w-10 text-center text-2xl font-black text-slate-900 tabular-nums">{count}</span>
              </div>
            ))}
            <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-black text-slate-900">
              <span className="px-3 py-1 bg-amber-100 rounded-xl border border-amber-300">{rekenrek[0]}</span>
              <span className="text-slate-400">+</span>
              <span className="px-3 py-1 bg-sky-100 rounded-xl border border-sky-300">{rekenrek[1]}</span>
              <span className="text-slate-400">=</span>
              <span className="px-4 py-1 bg-emerald-100 rounded-xl border border-emerald-300">{rekenrek[0] + rekenrek[1]}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 6: Bilancia libera */}
      {activeTool === 'balance' && (
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">La Bilancia dei Numeri</h2>
            <p className="text-xs text-slate-500">Aggiungi e togli mele sui due piatti: quando i numeri sono uguali la bilancia è in equilibrio!</p>
          </div>
          <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 space-y-4">
            <MathVisual
              visual={{
                kind: 'balance',
                left: Array(panLeft).fill('🍎'),
                right: Array(panRight).fill('🍎'),
                tilt: panLeft === panRight ? 'level' : panLeft > panRight ? 'left' : 'right',
              }}
            />
            <div className="flex items-center justify-around">
              {[
                { label: 'Sinistra', value: panLeft, set: setPanLeft },
                { label: 'Destra', value: panRight, set: setPanRight },
              ].map((pan) => (
                <div key={pan.label} className="flex items-center gap-2">
                  <button
                    aria-label={`Togli una mela a ${pan.label}`}
                    onClick={() => {
                      sound.playPop();
                      pan.set((v) => Math.max(0, v - 1));
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer"
                  >
                    <Minus className="w-4 h-4 mx-auto" />
                  </button>
                  <span className="text-2xl font-black w-8 text-center tabular-nums">{pan.value}</span>
                  <button
                    aria-label={`Aggiungi una mela a ${pan.label}`}
                    onClick={() => {
                      sound.playStarDing();
                      pan.set((v) => Math.min(12, v + 1));
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-center text-xl font-black text-slate-900 tabular-nums">
              {panLeft} {panLeft === panRight ? '=' : panLeft > panRight ? '>' : '<'} {panRight}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import { Question, VisualItem } from './types';

// Helper random choice & shuffle
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const EMOJI_POOL = ['🍎', '🍓', '🧁', '⭐', '🦋', '🐱', '🐶', '🍄', '🎈', '🐠', '🌸', '🍪', '🐸', '🚀', '💎'];

export function generateLevelQuestions(levelId: number, count: number = 5): Question[] {
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    questions.push(generateSingleQuestion(levelId, i));
  }

  return questions;
}

function generateSingleQuestion(levelId: number, index: number): Question {
  const qId = `l${levelId}_q${index}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // MONDO 1: Il Bosco dei Numeri (0-10)
  if (levelId === 1) {
    // Quantità da 1 a 5
    const target = randomInt(1, 5);
    const emoji = choice(['🍎', '🍓', '⭐', '🍄', '🐿️']);
    const items: VisualItem[] = Array.from({ length: target }, (_, k) => ({
      id: `it_${k}`,
      emoji,
      counted: false,
    }));
    const options = shuffle(Array.from(new Set([target, (target % 5) + 1, target > 1 ? target - 1 : 4, (target + 2) % 5 || 5])));
    return {
      id: qId,
      type: 'count_objects',
      title: 'Tocca e conta gli animaletti o i frutti!',
      instruction: `Quanti oggetti vedi nel prato? Puoi toccarli uno ad uno per contarli!`,
      speechText: `Quanti oggetti vedi nel prato? Toccali per contarli!`,
      itemsA: items,
      options,
      correctAnswer: target,
      explanation: `Bravissima! Nel prato ci sono esattamente ${target} ${emoji}!`,
      hint: `Tocca ciascun elemento per vedere apparire il numerino progressivo!`,
    };
  }

  if (levelId === 2) {
    // Quantità da 6 a 10
    const target = randomInt(6, 10);
    const emoji = choice(['🍄', '🌰', '🦋', '🌸', '🎈']);
    const items: VisualItem[] = Array.from({ length: target }, (_, k) => ({
      id: `it_${k}`,
      emoji,
      counted: false,
    }));
    const options = shuffle(Array.from(new Set([target, target - 1, target + 1 > 10 ? 5 : target + 1, target - 2])));
    return {
      id: qId,
      type: 'count_objects',
      title: 'Contiamo fino a 10!',
      instruction: `Conta con calma tutti gli oggetti sullo schermo.`,
      speechText: `Conta con calma tutti gli oggetti: quanti sono in tutto?`,
      itemsA: items,
      options,
      correctAnswer: target,
      explanation: `Esatto! Hai contato ${target} ${emoji}!`,
      hint: `Conta prima una fila di 5 e poi continua: 6, 7...`,
    };
  }

  if (levelId === 3) {
    // Precedente e Successivo
    const isPrecedente = Math.random() > 0.5;
    const base = randomInt(2, 9);
    const answer = isPrecedente ? base - 1 : base + 1;
    const questionWord = isPrecedente ? 'PRIMA' : 'DOPO';
    const speechType = isPrecedente ? 'precede' : 'segue';
    const options = shuffle(Array.from(new Set([answer, base, isPrecedente ? base + 1 : base - 1, base + 2])));
    return {
      id: qId,
      type: 'before_after',
      title: isPrecedente ? 'Chi viene PRIMA?' : 'Chi viene DOPO?',
      instruction: `Quale numero viene subito ${questionWord} del numero ${base}?`,
      speechText: `Quale numero viene subito ${questionWord} del numero ${base}?`,
      numberA: base,
      missingPosition: isPrecedente ? 'first' : 'last',
      options,
      correctAnswer: answer,
      explanation: `Super! Il numero che viene subito ${questionWord} di ${base} è proprio ${answer}!`,
      hint: `Pensa alla scala dei numeri: ... ${isPrecedente ? '?' : base}, ${isPrecedente ? base : '?'} ...`,
    };
  }

  if (levelId === 4) {
    // Linea dei numeri 0-10 con la ranocchia
    const start = randomInt(1, 5);
    const jump = randomInt(1, 4);
    const result = start + jump;
    const options = shuffle(Array.from(new Set([result, result - 1, result + 1, start + 1])));
    return {
      id: qId,
      type: 'number_line',
      title: 'I Salti della Ranocchia!',
      instruction: `La ranocchia è sul sasso ${start} e fa ${jump} salti in avanti. Su quale sasso atterra?`,
      speechText: `La ranocchia è sul sasso ${start} e fa ${jump} salti in avanti. Dove arriva?`,
      numberLineStart: start,
      numberLineJump: jump,
      numberLineMax: 10,
      options,
      correctAnswer: result,
      explanation: `Perfetto! Partendo da ${start} e saltando di ${jump} passi in avanti si arriva al sasso ${result}! (${start} + ${jump} = ${result})`,
      hint: `Guarda la linea dei numeri: parti da ${start} e conta ${jump} passi verso destra!`,
    };
  }

  if (levelId === 5) {
    // Sfida del Gufo (Misto 0-10)
    const subType = choice(['count', 'before_after', 'line']);
    if (subType === 'count') {
      const target = randomInt(4, 10);
      const emoji = choice(EMOJI_POOL);
      const items: VisualItem[] = Array.from({ length: target }, (_, k) => ({ id: `it_${k}`, emoji }));
      return {
        id: qId,
        type: 'count_objects',
        title: 'Sfida del Gufo: Quanti sono?',
        instruction: `Conta con precisione tutti gli oggetti mostrati!`,
        speechText: `Il saggio Gufo chiede: quanti oggetti ci sono?`,
        itemsA: items,
        options: shuffle(Array.from(new Set([target, target - 1, target + 1, target - 2]))),
        correctAnswer: target,
        explanation: `Magnifico! Ci sono proprio ${target} oggetti!`,
        hint: `Tocca gli oggetti per tener traccia del conto.`,
      };
    } else {
      const base = randomInt(3, 8);
      const isBefore = Math.random() > 0.5;
      const ans = isBefore ? base - 1 : base + 1;
      return {
        id: qId,
        type: 'before_after',
        title: 'Sfida del Gufo: La Sequenza',
        instruction: `Quale numero viene subito ${isBefore ? 'PRIMA' : 'DOPO'} di ${base}?`,
        speechText: `Quale numero viene subito ${isBefore ? 'prima' : 'dopo'} del numero ${base}?`,
        numberA: base,
        missingPosition: isBefore ? 'first' : 'last',
        options: shuffle(Array.from(new Set([ans, base, ans + 2, Math.max(1, ans - 2)]))),
        correctAnswer: ans,
        explanation: `Bravissima! ${ans} è il numero corretto!`,
        hint: `Conta piano a voce alta: 1, 2, 3...`,
      };
    }
  }

  // MONDO 2: Il Fiume del Coccodrillo (> < =)
  if (levelId === 6) {
    // Chi ha più pesciolini? (Confronto quantità visivo)
    const numA = randomInt(1, 9);
    let numB = randomInt(1, 9);
    while (numB === numA) numB = randomInt(1, 9);
    const itemsA: VisualItem[] = Array.from({ length: numA }, (_, k) => ({ id: `a_${k}`, emoji: '🐠' }));
    const itemsB: VisualItem[] = Array.from({ length: numB }, (_, k) => ({ id: `b_${k}`, emoji: '🐟' }));
    const correctSide = numA > numB ? 'Gruppo Blu (Sinistra)' : 'Gruppo Arancione (Destra)';

    return {
      id: qId,
      type: 'compare_numbers',
      title: 'Dove ci sono PIÙ pesci?',
      instruction: `Aiuta il coccodrillo goloso a scegliere il gruppo più numeroso!`,
      speechText: `Quale gruppo ha più pesciolini? Sinistra con ${numA} o Destra con ${numB}?`,
      numberA: numA,
      numberB: numB,
      itemsA,
      itemsB,
      options: ['Sinistra', 'Destra'],
      correctAnswer: numA > numB ? 'Sinistra' : 'Destra',
      explanation: `${numA > numB ? numA : numB} pesci sono più di ${numA < numB ? numA : numB}! Il coccodrillo nuota verso il gruppo con ${Math.max(numA, numB)}!`,
      hint: `Conta i pesci da un lato (${numA}) e dall'altro (${numB}). Qual è il numero più grande?`,
    };
  }

  if (levelId === 7) {
    // Simboli > e <
    const numA = randomInt(1, 9);
    let numB = randomInt(1, 9);
    while (numB === numA) numB = randomInt(1, 9);
    const sign = numA > numB ? '>' : '<';
    return {
      id: qId,
      type: 'compare_numbers',
      title: 'La Bocca del Coccodrillo: > o < ?',
      instruction: `Quale simbolo va tra ${numA} e ${numB}? Ricorda: la bocca aperta punta sempre verso il numero più grande!`,
      speechText: `Quale simbolo va tra ${numA} e ${numB}?`,
      numberA: numA,
      numberB: numB,
      options: ['>', '<'],
      correctAnswer: sign,
      explanation: `Esatto! ${numA} ${sign} ${numB}. La bocca aperta si mangia ${Math.max(numA, numB)}!`,
      hint: `La bocca aperta del coccodrillo si spalanca verso il numero più grande (${Math.max(numA, numB)})!`,
    };
  }

  if (levelId === 8) {
    // Gemelli e Uguali (=) o diversi
    const isEquals = Math.random() > 0.4;
    const numA = randomInt(1, 9);
    const numB = isEquals ? numA : randomInt(1, 9);
    const sign = numA === numB ? '=' : numA > numB ? '>' : '<';
    return {
      id: qId,
      type: 'compare_numbers',
      title: 'Maggiore, Minore o Uguale?',
      instruction: `Scegli il simbolo giusto tra ${numA} e ${numB}: > (maggiore), < (minore) o = (uguale)?`,
      speechText: `Scegli il simbolo giusto tra ${numA} e ${numB}. Sono maggiori, minori o uguali?`,
      numberA: numA,
      numberB: numB,
      options: ['>', '<', '='],
      correctAnswer: sign,
      explanation: numA === numB ? `Benissimo! ${numA} è uguale a ${numB}, quindi usiamo = !` : `Bravissima! ${numA} ${sign} ${numB}!`,
      hint: numA === numB ? `I due numeri sono identici!` : `Qual è il numero più grande?`,
    };
  }

  if (levelId === 9) {
    // Ordine crescente (dal più piccolo al più grande)
    const a = randomInt(1, 3);
    const b = randomInt(4, 6);
    const c = randomInt(7, 9);
    const correctSeq = `${a}, ${b}, ${c}`;
    const wrong1 = `${b}, ${a}, ${c}`;
    const wrong2 = `${c}, ${b}, ${a}`;
    const wrong3 = `${a}, ${c}, ${b}`;
    return {
      id: qId,
      type: 'order_numbers',
      title: 'Metti in Ordine Crescente!',
      instruction: `Quale sequenza ordina i numeri dal PIÙ PICCOLO al PIÙ GRANDE? (${c}, ${a}, ${b})`,
      speechText: `Quale sequenza va dal più piccolo al più grande con i numeri ${a}, ${b} e ${c}?`,
      options: shuffle([correctSeq, wrong1, wrong2, wrong3]),
      correctAnswer: correctSeq,
      explanation: `Bravissima! Salendo la scala: prima il ${a}, poi il ${b}, infine il ${c}!`,
      hint: `Cerca il numero più piccolo di tutti (${a}) all'inizio!`,
    };
  }

  if (levelId === 10) {
    // Sfida Ponte del Coccodrillo
    const numA = randomInt(2, 9);
    let numB = randomInt(2, 9);
    if (Math.random() > 0.6) numB = numA;
    const sign = numA === numB ? '=' : numA > numB ? '>' : '<';
    return {
      id: qId,
      type: 'compare_numbers',
      title: 'Sfida del Ponte: Confronta i Numeri!',
      instruction: `Completa la formula magica per passare il ponte: ${numA} [ ? ] ${numB}`,
      speechText: `Come si confrontano ${numA} e ${numB}?`,
      numberA: numA,
      numberB: numB,
      options: ['>', '<', '='],
      correctAnswer: sign,
      explanation: `Ottimo passaggio! ${numA} ${sign} ${numB}! Il ponte è sicuro!`,
      hint: `Se sono uguali usa =. Se uno è maggiore, la bocca aperta guarda lui!`,
    };
  }

  // MONDO 3: Il Castello delle Addizioni (+)
  if (levelId === 11) {
    // Somme visive fino a 5
    const a = randomInt(1, 3);
    const b = randomInt(1, 5 - a);
    const sum = a + b;
    const emoji = choice(['🍎', '🍓', '🍪', '⭐']);
    const itemsA: VisualItem[] = Array.from({ length: a }, (_, k) => ({ id: `a_${k}`, emoji }));
    const itemsB: VisualItem[] = Array.from({ length: b }, (_, k) => ({ id: `b_${k}`, emoji }));
    return {
      id: qId,
      type: 'addition_objects',
      title: 'Uniamo gli Oggetti!',
      instruction: `Abbiamo ${a} ${emoji} e ne aggiungiamo altre ${b} ${emoji}. Quante sono in tutto?`,
      speechText: `Abbiamo ${a} oggetti e ne aggiungiamo altri ${b}. Quanti sono in totale?`,
      numberA: a,
      numberB: b,
      itemsA,
      itemsB,
      options: shuffle(Array.from(new Set([sum, sum + 1, Math.max(1, sum - 1), sum + 2]))),
      correctAnswer: sum,
      explanation: `Evviva! ${a} + ${b} fa esattamente ${sum}!`,
      hint: `Conta tutti gli oggetti insieme: 1, 2, 3... fino all'ultimo!`,
    };
  }

  if (levelId === 12) {
    // Gli Amici del 10
    const a = randomInt(1, 9);
    const friend = 10 - a;
    return {
      id: qId,
      type: 'friends_of_ten',
      title: 'Gli Amici del 10!',
      instruction: `Qual è l'amico del 10 di ${a}? (${a} + ? = 10)`,
      speechText: `Qual è l'amico del 10 di ${a}? Quanto manca per arrivare a 10?`,
      numberA: a,
      targetSum: 10,
      options: shuffle(Array.from(new Set([friend, (friend + 2) % 9 || 9, Math.max(1, friend - 1), friend + 1]))),
      correctAnswer: friend,
      explanation: `Perfetto! ${a} e ${friend} sono amici del cuore perché ${a} + ${friend} = 10!`,
      hint: `Alza ${a} dita della mano: quante dita piegate mancano per fare 10?`,
    };
  }

  if (levelId === 13) {
    // Addizione sulla linea dei numeri
    const a = randomInt(2, 6);
    const b = randomInt(1, 4);
    const sum = a + b;
    return {
      id: qId,
      type: 'number_line',
      title: 'Addizione con i Salti!',
      instruction: `Calcola ${a} + ${b} saltando sulla linea dei numeri!`,
      speechText: `Calcola ${a} più ${b} saltando sulla linea dei numeri. Dove arrivi?`,
      numberLineStart: a,
      numberLineJump: b,
      numberLineMax: 10,
      options: shuffle(Array.from(new Set([sum, sum - 1, sum + 1, sum + 2]))),
      correctAnswer: sum,
      explanation: `Grande salto! Partendo da ${a} e facendo ${b} passi avanti si arriva a ${sum}!`,
      hint: `Trova il ${a} sulla linea e conta ${b} salti verso destra!`,
    };
  }

  if (levelId === 14) {
    // Calcolo rapido somma entro 10
    const a = randomInt(1, 5);
    const b = randomInt(1, 10 - a);
    const sum = a + b;
    return {
      id: qId,
      type: 'addition_objects',
      title: 'Calcolo Lampo!',
      instruction: `Quanto fa ${a} + ${b}?`,
      speechText: `Quanto fa ${a} più ${b}?`,
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([sum, sum + 1, Math.max(1, sum - 1), sum + 2]))),
      correctAnswer: sum,
      explanation: `Giustissimo! ${a} + ${b} = ${sum}!`,
      hint: `Tieni ${Math.max(a, b)} in mente e conta avanti con le dita!`,
    };
  }

  if (levelId === 15) {
    // Torneo del Re Mago (Addizioni miste)
    const a = randomInt(2, 5);
    const b = randomInt(2, 5);
    const sum = a + b;
    return {
      id: qId,
      type: 'addition_objects',
      title: 'Sfida Reale: Prova di Magia!',
      instruction: `Il Re Mago unisce due pozioni: ${a} gocce + ${b} gocce. Quante sono in tutto?`,
      speechText: `Il Re Mago unisce ${a} gocce più ${b} gocce. Quante gocce sono in totale?`,
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([sum, sum - 1, sum + 1, sum + 2]))),
      correctAnswer: sum,
      explanation: `La pozione brilla! ${a} + ${b} = ${sum}! Hai superato la prova del Re Mago!`,
      hint: `Conta le gocce: ${a} più altre ${b}!`,
    };
  }

  // MONDO 4: La Caverna delle Sottrazioni (-)
  if (levelId === 16) {
    // Quanti ne rimangono? Sottrazioni visive
    const total = randomInt(3, 7);
    const removed = randomInt(1, total - 1);
    const remain = total - removed;
    const emoji = choice(['🎈', '🧁', '💎', '🍓']);
    const itemsA: VisualItem[] = Array.from({ length: total }, (_, k) => ({
      id: `it_${k}`,
      emoji,
      label: k < removed ? '❌' : undefined,
    }));
    return {
      id: qId,
      type: 'subtraction_objects',
      title: 'Quanti ne Rimangono?',
      instruction: `C'erano ${total} ${emoji}. Ne sono stati tolti ${removed} (con la ❌). Quanti ne rimangono?`,
      speechText: `C'erano ${total} oggetti. Ne sono stati tolti ${removed}. Quanti ne restano?`,
      numberA: total,
      numberB: removed,
      itemsA,
      options: shuffle(Array.from(new Set([remain, remain + 1, Math.max(1, remain - 1), remain + 2]))),
      correctAnswer: remain,
      explanation: `Esatto! ${total} - ${removed} = ${remain}! Rimangono ${remain} oggetti senza la croce!`,
      hint: `Conta solo gli oggetti senza la croce rossa!`,
    };
  }

  if (levelId === 17) {
    // Salti all'indietro sulla linea
    const start = randomInt(5, 10);
    const back = randomInt(1, 4);
    const result = start - back;
    return {
      id: qId,
      type: 'number_line',
      title: 'Salti all’Indietro!',
      instruction: `Il granchietto è sul numero ${start} e fa ${back} passi all'indietro. Dove arriva? (${start} - ${back})`,
      speechText: `Il granchietto è sul sasso ${start} e fa ${back} passi all'indietro. Su quale numero arriva?`,
      numberLineStart: start,
      numberLineJump: -back,
      numberLineMax: 10,
      options: shuffle(Array.from(new Set([result, result + 1, result - 1, start - 1]))),
      correctAnswer: result,
      explanation: `Perfetto! Tornando indietro di ${back} passi dal sasso ${start} si arriva al sasso ${result}!`,
      hint: `Parti da ${start} e cammina verso sinistra di ${back} passi!`,
    };
  }

  if (levelId === 18) {
    // Quanto manca per arrivare a...?
    const current = randomInt(2, 6);
    const goal = randomInt(current + 1, 9);
    const diff = goal - current;
    return {
      id: qId,
      type: 'subtraction_objects',
      title: 'Quanto Manca?',
      instruction: `Hai ${current} monete, ma te ne servono ${goal} per un giocattolo. Quante monete ti mancano?`,
      speechText: `Hai ${current} monete e te ne servono ${goal}. Quante monete ti mancano per arrivare a ${goal}?`,
      numberA: goal,
      numberB: current,
      options: shuffle(Array.from(new Set([diff, diff + 1, Math.max(1, diff - 1), diff + 2]))),
      correctAnswer: diff,
      explanation: `Bravissima! ${goal} - ${current} = ${diff}! Ti mancano esattamente ${diff} monete!`,
      hint: `Conta a partire da ${current} fino ad arrivare a ${goal}: quante dita alzi?`,
    };
  }

  if (levelId === 19) {
    // Calcolo a mente sottrazioni entro 10
    const a = randomInt(4, 9);
    const b = randomInt(1, a - 1);
    const res = a - b;
    return {
      id: qId,
      type: 'subtraction_objects',
      title: 'Fulmine Sottrattivo!',
      instruction: `Calcola rapidamente: quanto fa ${a} - ${b}?`,
      speechText: `Calcola velocemente: quanto fa ${a} meno ${b}?`,
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([res, res + 1, Math.max(0, res - 1), res + 2]))),
      correctAnswer: res,
      explanation: `Meravigliosa! ${a} - ${b} = ${res}!`,
      hint: `Alza ${a} dita e abbassane ${b}: quante ne restano in piedi?`,
    };
  }

  if (levelId === 20) {
    // Drago Custode (Sfida sottrazioni)
    const a = randomInt(6, 10);
    const b = randomInt(2, 5);
    const res = a - b;
    return {
      id: qId,
      type: 'subtraction_objects',
      title: 'La Sfida del Drago Gentile',
      instruction: `Il Drago custodisce ${a} cristalli. Ne regala ${b} a una farfalla. Quanti cristalli gli rimangono?`,
      speechText: `Il Drago ha ${a} cristalli e ne regala ${b}. Quanti cristalli gli rimangono?`,
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([res, res + 1, res - 1, res + 2]))),
      correctAnswer: res,
      explanation: `Il Drago ti ringrazia e sorride felice! ${a} - ${b} fa proprio ${res}!`,
      hint: `Fai una sottrazione: ${a} togliendo ${b}!`,
    };
  }

  // MONDO 5: La Montagna delle Decine e Unità (10 a 20 e l'Abaco)
  if (levelId === 21) {
    // Il sacco della Decina (10 u = 1 da)
    const units = randomInt(1, 8);
    const total = 10 + units;
    return {
      id: qId,
      type: 'tens_and_units',
      title: '1 Decina e le Unità',
      instruction: `Abbiamo 1 sacchetto da 10 caramelle (1 decina) e ${units} caramelle sciolte (unità). Quante sono in tutto?`,
      speechText: `Abbiamo 1 decina e ${units} unità. Che numero formano insieme?`,
      numberA: 1, // 1 da
      numberB: units, // units
      options: shuffle(Array.from(new Set([total, total - 1, total + 1, total - 2]))),
      correctAnswer: total,
      explanation: `Fantastico! 1 decina (10) e ${units} unità fanno ${total}!`,
      hint: `10 + ${units} = ${total}!`,
    };
  }

  if (levelId === 22) {
    // Numeri da 11 a 20 scomposti
    const num = randomInt(11, 19);
    const u = num - 10;
    const ansText = `1 da e ${u} u`;
    const wrong1 = `1 da e ${u + 1} u`;
    const wrong2 = `2 da e ${u} u`;
    const wrong3 = `0 da e ${num} u`;
    return {
      id: qId,
      type: 'tens_and_units',
      title: `Come si scompone il numero ${num}?`,
      instruction: `Il numero ${num} è formato da quante decine (da) e quante unità (u)?`,
      speechText: `Come si scompone il numero ${num}? Quante decine e quante unità?`,
      numberA: num,
      options: shuffle([ansText, wrong1, wrong2, wrong3]),
      correctAnswer: ansText,
      explanation: `Esattamente! ${num} è formato da 1 decina (da) e ${u} unità (u)!`,
      hint: `La prima cifra a sinistra è la decina (1), la seconda cifra è l'unità (${u})!`,
    };
  }

  if (levelId === 23) {
    // L'Abaco Magico (Palline rosse da e blu u)
    const da = 1;
    const u = randomInt(1, 9);
    const total = da * 10 + u;
    return {
      id: qId,
      type: 'tens_and_units',
      title: 'Leggi l’Abaco Magico!',
      instruction: `Sull'abaco vedi ${da} pallina ROSSA sull'asta delle decine (da) e ${u} palline BLU sull'asta delle unità (u). Che numero è?`,
      speechText: `Guarda l'abaco con ${da} pallina rossa nelle decine e ${u} palline blu nelle unità. Che numero è?`,
      numberA: da,
      numberB: u,
      options: shuffle(Array.from(new Set([total, total - 1, total + 1, total - 2]))),
      correctAnswer: total,
      explanation: `Bravissima! ${da} decina (10) + ${u} unità (${u}) fa il numero ${total}!`,
      hint: `Ogni pallina rossa vale 10! Ogni pallina blu vale 1!`,
    };
  }

  if (levelId === 24) {
    // Somme con il 10 (es. 10 + 6 o 14 - 4)
    const isSum = Math.random() > 0.5;
    const u = randomInt(2, 9);
    if (isSum) {
      const sum = 10 + u;
      return {
        id: qId,
        type: 'addition_objects',
        title: 'La Magia del 10!',
        instruction: `Quanto fa 10 + ${u}?`,
        speechText: `Quanto fa 10 più ${u}?`,
        numberA: 10,
        numberB: u,
        options: shuffle(Array.from(new Set([sum, sum - 1, sum + 1, sum + 2]))),
        correctAnswer: sum,
        explanation: `Facilissimo! Quando aggiungi ${u} a 10 ottieni ${sum}!`,
        hint: `Il ${u} prende il posto dello zero nel 10!`,
      };
    } else {
      const total = 10 + u;
      return {
        id: qId,
        type: 'subtraction_objects',
        title: 'Togliamo le Unità!',
        instruction: `Quanto fa ${total} - ${u}?`,
        speechText: `Quanto fa ${total} meno ${u}?`,
        numberA: total,
        numberB: u,
        options: shuffle(Array.from(new Set([10, 10 + 1, 10 - 1, u]))),
        correctAnswer: 10,
        explanation: `Bravissima! Togliendo le unità ${u} da ${total} rimane la decina intera: 10!`,
        hint: `Se togli le ${u} unità sciolte, cosa resta?`,
      };
    }
  }

  if (levelId === 25) {
    // Sfida della Vetta
    const da = 1;
    const u = randomInt(0, 9);
    const total = 10 + u;
    return {
      id: qId,
      type: 'tens_and_units',
      title: 'Sfida della Vetta: Conquista le Decine!',
      instruction: `Se unisci 10 stelline d'oro in una scatola e lasci ${u} stelline fuori, quante ne hai in tutto?`,
      speechText: `10 stelline dentro la scatola e ${u} stelline fuori: quante sono in tutto?`,
      numberA: 10,
      numberB: u,
      options: shuffle(Array.from(new Set([total, total + 1, total - 1, total + 2]))),
      correctAnswer: total,
      explanation: `Bandiera piantata sulla vetta! Ci sono esattamente ${total} stelline!`,
      hint: `10 + ${u} = ${total}!`,
    };
  }

  // MONDO 6: Il Giardino delle Forme e dello Spazio
  if (levelId === 26) {
    // Riconoscimento forme (Cerchio, Quadrato, Triangolo, Rettangolo)
    const shapes: ('cerchio' | 'quadrato' | 'triangolo' | 'rettangolo')[] = ['cerchio', 'quadrato', 'triangolo', 'rettangolo'];
    const chosen = choice(shapes);
    const shapeLabels: Record<string, { name: string; emoji: string; desc: string }> = {
      cerchio: { name: 'Cerchio', emoji: '🔴', desc: 'è rotondo senza angoli né spigoli' },
      quadrato: { name: 'Quadrato', emoji: '🟦', desc: 'ha 4 lati tutti perfettamente uguali' },
      triangolo: { name: 'Triangolo', emoji: '🔺', desc: 'ha 3 lati e 3 punte' },
      rettangolo: { name: 'Rettangolo', emoji: '🟩', desc: 'ha 4 lati: 2 lunghi e 2 corti' },
    };
    return {
      id: qId,
      type: 'shapes_and_space',
      title: 'Riconosci la Figura Geometrica!',
      instruction: `Quale forma geometrica ${shapeLabels[chosen].desc}?`,
      speechText: `Quale forma geometrica ${shapeLabels[chosen].desc}?`,
      shapeType: chosen,
      options: ['Cerchio', 'Quadrato', 'Triangolo', 'Rettangolo'],
      correctAnswer: shapeLabels[chosen].name,
      explanation: `Esatto! È proprio il ${shapeLabels[chosen].name} ${shapeLabels[chosen].emoji}!`,
      hint: `Conta i lati o guarda la rotondità!`,
    };
  }

  if (levelId === 27) {
    // Topologia: Sopra, Sotto, Dentro, Fuori
    const concepts = [
      { q: 'La farfallina vola SOPRA il fiore 🌸🦋. Dove si trova la farfallina?', a: 'Sopra', o: ['Sopra', 'Sotto'] },
      { q: 'La ranocchia è DENTRO lo stagno 💧🐸. Dove si trova la ranocchia?', a: 'Dentro', o: ['Dentro', 'Fuori'] },
      { q: 'La talpa scava SOTTO terra 🕳️. Dove si trova la talpa?', a: 'Sotto', o: ['Sopra', 'Sotto'] },
      { q: 'Il cagnolino gioca FUORI dalla cuccia 🐶🏠. Dove si trova?', a: 'Fuori', o: ['Dentro', 'Fuori'] },
    ];
    const item = choice(concepts);
    return {
      id: qId,
      type: 'shapes_and_space',
      title: 'Orientamento nello Spazio',
      instruction: item.q,
      speechText: item.q,
      options: item.o,
      correctAnswer: item.a,
      explanation: `Bravissima! Si trova proprio ${item.a.toLowerCase()}!`,
      hint: `Rileggi attentamente la frase!`,
    };
  }

  if (levelId === 28) {
    // Destra o Sinistra
    const isRight = Math.random() > 0.5;
    return {
      id: qId,
      type: 'shapes_and_space',
      title: 'Destra o Sinistra?',
      instruction: isRight
        ? 'Guarda la mela a DESTRA ➡️🍎. Da che parte si trova?'
        : 'Guarda la stellina a SINISTRA ⬅️⭐. Da che parte si trova?',
      speechText: isRight ? 'Da che parte si trova la mela? A destra o a sinistra?' : 'Da che parte si trova la stella? A destra o a sinistra?',
      options: ['A Sinistra', 'A Destra'],
      correctAnswer: isRight ? 'A Destra' : 'A Sinistra',
      explanation: `Ottimo orientamento! Si trova proprio ${isRight ? 'a Destra ➡️' : 'a Sinistra ⬅️'}!`,
      hint: `Pensa alla mano con cui scrivi o alla freccia!`,
    };
  }

  if (levelId === 29) {
    // Ritmi e serie logiche
    const patterns = [
      { pattern: '🔴 🟦 🔴 🟦 🔴 ...', ans: '🟦', options: ['🟦', '🔴', '🔺', '⭐'], exp: 'La sequenza alterna cerchio e quadrato!' },
      { pattern: '⭐ ⭐ 🌙 ⭐ ⭐ ...', ans: '🌙', options: ['🌙', '⭐', '☀️', '🌸'], exp: 'Due stelle, una luna, due stelle, una luna!' },
      { pattern: '🔺 🟢 🔺 🟢 🔺 ...', ans: '🟢', options: ['🟢', '🔺', '🟦', '⭐'], exp: 'Si alterna triangolo e cerchio verde!' },
    ];
    const p = choice(patterns);
    return {
      id: qId,
      type: 'shapes_and_space',
      title: 'Continua la Serie Magica!',
      instruction: `Quale simbolo completa la sequenza? ${p.pattern}`,
      speechText: `Quale simbolo viene dopo nella sequenza?`,
      options: p.options,
      correctAnswer: p.ans,
      explanation: `Fantastico occhio! ${p.exp}`,
      hint: `Ripeti i simboli a ritmo nella tua mente: uno dopo l'altro!`,
    };
  }

  if (levelId === 30) {
    // Fontana delle Forme (Sfida)
    const sides = choice([3, 4, 0]);
    let shapeName = '';
    let prompt = '';
    if (sides === 3) {
      shapeName = 'Triangolo';
      prompt = 'Quale figura ha esattamente 3 lati e 3 angoli?';
    } else if (sides === 4) {
      shapeName = 'Quadrato';
      prompt = 'Quale figura ha 4 lati perfettamente uguali?';
    } else {
      shapeName = 'Cerchio';
      prompt = 'Quale figura non ha nessun lato dritto ed è tutta rotonda?';
    }
    return {
      id: qId,
      type: 'shapes_and_space',
      title: 'La Fontana Magica delle Forme!',
      instruction: prompt,
      speechText: prompt,
      options: ['Cerchio', 'Quadrato', 'Triangolo', 'Rettangolo'],
      correctAnswer: shapeName,
      explanation: `Splendido! È il ${shapeName}! La fontana zampilla acqua brillante!`,
      hint: `Pensa al numero di lati o alla rotondità della forma!`,
    };
  }

  // MONDO 7: Il Villaggio dei Problemini Illustrati
  if (levelId === 31) {
    // Problemi di addizione con dolci
    const a = randomInt(2, 5);
    const b = randomInt(1, 4);
    const sum = a + b;
    return {
      id: qId,
      type: 'word_problem',
      title: 'I Pasticcini della Nonna',
      instruction: `La nonna prepara ${a} biscotti al cioccolato 🍪. Poi ne sforna altri ${b} alla vaniglia. Quanti biscotti ha preparato in tutto?`,
      speechText: `La nonna prepara ${a} biscotti al cioccolato. Poi ne sforna altri ${b} alla vaniglia. Quanti biscotti ha in tutto?`,
      storyIllustration: '👵 🍪 🧁 🥛',
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([sum, sum - 1, sum + 1, sum + 2]))),
      correctAnswer: sum,
      explanation: `Brava! ${a} biscotti + ${b} biscotti = ${sum} biscotti deliziosi!`,
      hint: `Per sapere quanti sono in tutto bisogna mettere insieme con il segno PIÙ (+)!`,
    };
  }

  if (levelId === 32) {
    // Problemi di sottrazione con palloncini
    const a = randomInt(5, 9);
    const b = randomInt(1, 4);
    const diff = a - b;
    return {
      id: qId,
      type: 'word_problem',
      title: 'I Palloncini al Parco',
      instruction: `Al parco giochi ci sono ${a} palloncini colorati 🎈. Il vento ne fa volare via ${b} nel cielo. Quanti palloncini sono rimasti?`,
      speechText: `Al parco ci sono ${a} palloncini. Il vento ne fa volare via ${b}. Quanti palloncini rimangono?`,
      storyIllustration: '🌳 🎈 🎈 💨 🎈',
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([diff, diff + 1, Math.max(1, diff - 1), diff + 2]))),
      correctAnswer: diff,
      explanation: `Esatto! ${a} - ${b} = ${diff}! Ne rimangono ${diff} stretti con il filo!`,
      hint: `Se volano via, dobbiamo TOGLIERE con il segno MENO (-)!`,
    };
  }

  if (levelId === 33) {
    // Mercatino delle monete
    const cost = choice([2, 3, 4]);
    const paid = 5;
    const change = paid - cost;
    return {
      id: qId,
      type: 'word_problem',
      title: 'Al Mercatino dei Giocattoli',
      instruction: `Un quaderno fatato costa ${cost} euro 🪙. Paghi con una moneta da 5 euro. Quanto ricevi di resto?`,
      speechText: `Un quaderno fatato costa ${cost} euro. Paghi con una moneta da 5 euro. Quanto ricevi di resto?`,
      storyIllustration: '🏪 🪙 📔 🧸',
      numberA: paid,
      numberB: cost,
      options: shuffle(Array.from(new Set([change, change + 1, Math.max(1, change - 1), change + 2]))),
      correctAnswer: change,
      explanation: `Bravissima negoziante! 5 euro - ${cost} euro = ${change} euro di resto!`,
      hint: `Fai 5 meno ${cost}!`,
    };
  }

  if (levelId === 34) {
    // Scegli l'operazione giusta: + o -?
    const scenarios = [
      { text: 'Martina ha 4 adesivi e ne riceve altri 2 in regalo. Per sapere quanti ne ha in tutto, quale operazione usi?', ans: '+ (Addizione)', hint: 'Quando ricevi o metti insieme si usa il PIÙ (+)' },
      { text: 'Sul ramo ci sono 6 uccellini, poi 2 volano via. Per sapere quanti ne restano, quale operazione usi?', ans: '- (Sottrazione)', hint: 'Quando togli o volano via si usa il MENO (-)' },
      { text: 'Nel canestro ci sono 3 mele rosse e 3 mele verdi. Per sapere il totale, cosa usi?', ans: '+ (Addizione)', hint: 'Per unire due gruppi si usa l’addizione (+)' },
    ];
    const sc = choice(scenarios);
    return {
      id: qId,
      type: 'word_problem',
      title: 'Scegli il Segno Giusto: + o - ?',
      instruction: sc.text,
      speechText: sc.text,
      options: ['+ (Addizione)', '- (Sottrazione)'],
      correctAnswer: sc.ans,
      explanation: `Proprio così! ${sc.hint}!`,
      hint: sc.hint,
    };
  }

  if (levelId === 35) {
    // Medaglia del Sindaco
    const a = randomInt(4, 8);
    const b = randomInt(2, 4);
    const sum = a + b;
    return {
      id: qId,
      type: 'word_problem',
      title: 'La Festa del Sindaco',
      instruction: `Il sindaco decora la piazza con ${a} bandierine azzurre e ${b} bandierine gialle. Quante bandierine ci sono in totale?`,
      speechText: `Ci sono ${a} bandierine azzurre e ${b} bandierine gialle. Quante sono in totale?`,
      storyIllustration: '🏛️ 🚩 🎊 🥳',
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([sum, sum + 1, sum - 1, sum + 2]))),
      correctAnswer: sum,
      explanation: `Il Sindaco ti appunta la medaglia d'oro! ${a} + ${b} = ${sum} bandierine!`,
      hint: `Somma le bandierine azzurre con quelle gialle!`,
    };
  }

  // MONDO 8: Il Tempio del Gran Maestro
  if (levelId === 36) {
    // Numeri Pari e Dispari
    const num = randomInt(1, 10);
    const isEven = num % 2 === 0;
    const ans = isEven ? 'Pari' : 'Dispari';
    return {
      id: qId,
      type: 'even_odd',
      title: 'Pari o Dispari?',
      instruction: `Il numero ${num} è PARI o DISPARI? (I pari formano coppie perfette a due a due!)`,
      speechText: `Il numero ${num} è pari o dispari?`,
      numberA: num,
      options: ['Pari', 'Dispari'],
      correctAnswer: ans,
      explanation: isEven ? `Esatto! ${num} è PARI perché possiamo fare coppie perfette a 2 a 2!` : `Esatto! ${num} è DISPARI perché se facciamo le coppie ne rimane uno solo!`,
      hint: isEven ? `Conta per 2: 2, 4, 6, 8, 10... sono tutti pari!` : `Se fai le coppie, ne avanza uno da solo!`,
    };
  }

  if (levelId === 37) {
    // Salti da 2 in 2 e da 5 in 5 fino a 20 o 30
    const step = choice([2, 5]);
    const start = step === 2 ? choice([2, 4, 6, 8]) : choice([5, 10, 15]);
    const next = start + step;
    return {
      id: qId,
      type: 'number_line',
      title: `Contiamo a Passi di ${step}!`,
      instruction: `Saltando di ${step} in ${step}: dopo il ${start}, quale numero viene?`,
      speechText: `Saltando a passi di ${step}: dopo il numero ${start}, quale numero arriva?`,
      numberA: start,
      options: shuffle(Array.from(new Set([next, next - 1, next + step, start + 1]))),
      correctAnswer: next,
      explanation: `Bravissima! ${start} + ${step} = ${next}! Sei super veloce a contare a passi!`,
      hint: `Aggiungi ${step} a ${start}!`,
    };
  }

  if (levelId === 38) {
    // Indovinelli ed Enigmi Matematici
    const riddles = [
      { text: 'Sono maggiore di 6 e minore di 8. Che numero sono?', ans: 7, options: [7, 5, 8, 9] },
      { text: 'Se mi aggiungi 1 divento 10. Che numero sono?', ans: 9, options: [9, 8, 10, 11] },
      { text: 'Se mi togli 2 divento 5. Che numero sono?', ans: 7, options: [7, 6, 8, 3] },
      { text: 'Sono il doppio di 4 (4 + 4). Che numero sono?', ans: 8, options: [8, 6, 9, 10] },
      { text: 'Sono una decina esatta e 0 unità. Che numero sono?', ans: 10, options: [10, 1, 100, 20] },
    ];
    const r = choice(riddles);
    return {
      id: qId,
      type: 'word_problem',
      title: 'L’Indovinello del Maestro!',
      instruction: r.text,
      speechText: r.text,
      options: shuffle(r.options),
      correctAnswer: r.ans,
      explanation: `Acume formidabile! La risposta all'indovinello è proprio ${r.ans}!`,
      hint: `Leggi bene gli indizi o conta sulla linea dei numeri!`,
    };
  }

  if (levelId === 39) {
    // Gran Misto di 1ª Elementare
    const a = randomInt(5, 10);
    const b = randomInt(2, 5);
    const isSum = Math.random() > 0.5;
    const res = isSum ? a + b : a - b;
    return {
      id: qId,
      type: isSum ? 'addition_objects' : 'subtraction_objects',
      title: 'Il Gran Misto di 1ª Elementare!',
      instruction: `Calcola con sicurezza: quanto fa ${a} ${isSum ? '+' : '-'} ${b}?`,
      speechText: `Quanto fa ${a} ${isSum ? 'più' : 'meno'} ${b}?`,
      numberA: a,
      numberB: b,
      options: shuffle(Array.from(new Set([res, res + 1, res - 1, res + 2]))),
      correctAnswer: res,
      explanation: `Grandiosa! ${a} ${isSum ? '+' : '-'} ${b} = ${res}!`,
      hint: isSum ? `Fai la somma mettendo insieme!` : `Fai la sottrazione togliendo!`,
    };
  }

  // Level 40: Prova della Gran Campionessa
  const a = randomInt(10, 14);
  const b = randomInt(2, 5);
  const sum = a + b;
  return {
    id: qId,
    type: 'word_problem',
    title: 'La Prova della Gran Campionessa!',
    instruction: `Il Gran Maestro ti consegna la pergamena reale: quanto fa ${a} + ${b}?`,
    speechText: `La prova reale della Gran Campionessa: quanto fa ${a} più ${b}?`,
    storyIllustration: '👑 📜 🌟 🏰 💎',
    numberA: a,
    numberB: b,
    options: shuffle(Array.from(new Set([sum, sum - 1, sum + 1, sum + 2]))),
    correctAnswer: sum,
    explanation: `Trionfo assoluto! ${a} + ${b} fa ${sum}! Hai conquistato la Corona della Matematica di Prima Elementare!`,
    hint: `10 + ${a - 10} + ${b} = ${sum}!`,
  };
}

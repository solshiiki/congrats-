// Poker Lab — Texas Hold'em Monte Carlo odds

const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"]; // idx 0..12
const SUITS = ["s","h","d","c"]; // spades, hearts, diamonds, clubs
const SUIT_SYMBOL = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLOR = { s: "black", c: "black", h: "red", d: "red" };

const SLOT_IDS = ["h1","h2","b1","b2","b3","b4","b5"];

const pickerBackdrop = document.getElementById("pickerBackdrop");
const pickerGrid = document.getElementById("pickerGrid");
const pickerClose = document.getElementById("pickerClose");
const pickerClear = document.getElementById("pickerClear");

const opponentsInput = document.getElementById("opponents");
const opponentsValue = document.getElementById("opponentsValue");
const iterationsInput = document.getElementById("iterations");
const iterationsValue = document.getElementById("iterationsValue");

const statWin = document.getElementById("stat-win");
const statTie = document.getElementById("stat-tie");
const statLose = document.getElementById("stat-lose");
const progressBar = document.getElementById("progressBar");
const runInfo = document.getElementById("runInfo");
const handName = document.getElementById("handName");

const btnRandom = document.getElementById("btn-random");
const btnClear = document.getElementById("btn-clear");
const btnCalc = document.getElementById("btn-calc");

let activeSlot = null; // e.g. 'h1'
let cancelRun = false;

function makeDeckIds() {
  const deck = [];
  for (let r = 0; r < RANKS.length; r++) {
    for (let s = 0; s < SUITS.length; s++) {
      deck.push(RANKS[r] + SUITS[s]);
    }
  }
  return deck;
}

function cardIdToObj(id) {
  const rank = id[0];
  const suit = id[1];
  return { rankIndex: RANKS.indexOf(rank), suitIndex: SUITS.indexOf(suit) };
}

function renderCardFace(id, small = false) {
  const rank = id[0];
  const suit = id[1];
  const colorClass = SUIT_COLOR[suit] === "red" ? "red" : "black";
  const cardClass = small ? "picker-card" : "card";
  return `<div class="${cardClass} ${colorClass}"><div class="rank">${rank}</div><div class="suit">${SUIT_SYMBOL[suit]}</div></div>`;
}

function getUsedCardIds() {
  const used = new Set();
  for (const slotId of SLOT_IDS) {
    const el = document.querySelector(`.card-slot[data-slot="${slotId}"]`);
    const id = el.getAttribute("data-card") || "";
    if (id) used.add(id);
  }
  return used;
}

function setSlotCard(slotId, cardId) {
  const el = document.querySelector(`.card-slot[data-slot="${slotId}"]`);
  if (!el) return;
  if (!cardId) {
    el.removeAttribute("data-card");
    el.innerHTML = "";
    el.classList.remove("filled");
    return;
  }
  el.setAttribute("data-card", cardId);
  el.innerHTML = renderCardFace(cardId);
  el.classList.add("filled");
}

function clearAllSlots() {
  for (const slotId of SLOT_IDS) setSlotCard(slotId, "");
  updateStats(null);
  handName.textContent = "";
}

function randomChoice(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function drawRandom(deck) {
  const idx = (Math.random() * deck.length) | 0;
  const picked = deck[idx];
  deck[idx] = deck[deck.length - 1];
  deck.pop();
  return picked;
}

function openPicker(slotId) {
  activeSlot = slotId;
  refreshPickerGrid();
  pickerBackdrop.classList.remove("hidden");
  pickerBackdrop.setAttribute("aria-hidden", "false");
}

function closePicker() {
  activeSlot = null;
  pickerBackdrop.classList.add("hidden");
  pickerBackdrop.setAttribute("aria-hidden", "true");
}

function refreshPickerGrid() {
  const used = getUsedCardIds();
  const deck = makeDeckIds();
  pickerGrid.innerHTML = "";
  // 13 ranks x 4 suits grid visually: loop ranks first for nice columns
  for (let r = 0; r < RANKS.length; r++) {
    for (let s = 0; s < SUITS.length; s++) {
      const id = RANKS[r] + SUITS[s];
      const div = document.createElement("div");
      div.className = "picker-card" + (used.has(id) ? " disabled" : "");
      div.dataset.card = id;
      div.innerHTML = renderCardFace(id, true);
      div.addEventListener("click", () => {
        setSlotCard(activeSlot, id);
        updateHandName();
        closePicker();
      });
      pickerGrid.appendChild(div);
    }
  }
}

function updateSliderLabels() {
  opponentsValue.textContent = String(opponentsInput.value);
  iterationsValue.textContent = String(iterationsInput.value);
}

function updateStats(stats) {
  if (!stats) {
    statWin.textContent = "—";
    statTie.textContent = "—";
    statLose.textContent = "—";
    progressBar.style.width = "0%";
    runInfo.textContent = "";
    return;
  }
  statWin.textContent = `${stats.winPct.toFixed(1)}%`;
  statTie.textContent = `${stats.tiePct.toFixed(1)}%`;
  statLose.textContent = `${stats.losePct.toFixed(1)}%`;
  runInfo.textContent = `Побед: ${stats.wins} · Ничьих: ${stats.ties} · Поражений: ${stats.losses} · Всего: ${stats.total}`;
}

function updateHandName() {
  const h1 = document.querySelector('.card-slot[data-slot="h1"]').getAttribute("data-card");
  const h2 = document.querySelector('.card-slot[data-slot="h2"]').getAttribute("data-card");
  if (!h1 || !h2) { handName.textContent = ""; return; }
  const name = handLabel(h1, h2);
  handName.textContent = name;
}

function handLabel(c1, c2) {
  // e.g. AsKh -> AKs; 7d7h -> 77
  const r1 = c1[0], r2 = c2[0];
  const s1 = c1[1], s2 = c2[1];
  const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2);
  let hi = r1, lo = r2;
  let suited = s1 === s2;
  if (i2 > i1) { hi = r2; lo = r1; suited = s1 === s2; }
  if (r1 === r2) return `${r1}${r2}`;
  return `${hi}${lo}${suited ? "s" : "o"}`;
}

function gatherSelection() {
  const selected = {};
  for (const slotId of SLOT_IDS) {
    const id = document.querySelector(`.card-slot[data-slot="${slotId}"]`).getAttribute("data-card");
    if (id) selected[slotId] = id;
  }
  return selected;
}

// ===== Poker hand evaluation =====

const CATEGORY = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
};

function evaluate5(cardIds) {
  // cardIds: array of 5 like ['As','Kd',...]
  // Return vector like [category, ...kickers]
  const ranks = cardIds.map(id => RANKS.indexOf(id[0]));
  const suits = cardIds.map(id => SUITS.indexOf(id[1]));

  // counts per rank
  const countByRank = new Array(13).fill(0);
  for (const ri of ranks) countByRank[ri]++;

  const uniqueRanks = [];
  for (let i = 0; i < 13; i++) if (countByRank[i] > 0) uniqueRanks.push(i);
  uniqueRanks.sort((a, b) => b - a);

  const isFlush = suits.every(s => s === suits[0]);

  // Straight detection with wheel (A can be high or count as 1)
  function straightHigh(uniqueDesc) {
    // uniqueDesc: ranks in descending order (12..0)
    let arr = uniqueDesc.slice();
    // Allow A-2-3-4-5 by appending a virtual -1 after 0 if Ace (12) is present at top
    if (arr[0] === 12) arr = arr.concat([-1]);
    let run = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1] - arr[i] === 1) {
        run++;
        if (run >= 5) return arr[i - 4]; // high rank index of straight
      } else if (arr[i - 1] !== arr[i]) {
        run = 1;
      }
    }
    return -1;
  }

  const hiStraight = straightHigh(uniqueRanks);
  const isStraight = hiStraight !== -1;

  // groups: [count, rank] sorted by count desc then rank desc
  const groups = [];
  for (let r = 12; r >= 0; r--) if (countByRank[r] > 0) groups.push([countByRank[r], r]);
  groups.sort((a, b) => (b[0] - a[0]) || (b[1] - a[1]));

  if (isFlush && isStraight) {
    return [CATEGORY.STRAIGHT_FLUSH, hiStraight];
  }
  if (groups[0][0] === 4) {
    // quads + kicker
    const four = groups[0][1];
    const kicker = groups[1][1];
    return [CATEGORY.FOUR_OF_A_KIND, four, kicker];
  }
  if (groups[0][0] === 3 && groups[1][0] === 2) {
    return [CATEGORY.FULL_HOUSE, groups[0][1], groups[1][1]];
  }
  if (isFlush) {
    // top 5 kickers sorted desc
    const top = ranks.slice().sort((a, b) => b - a);
    return [CATEGORY.FLUSH, ...top];
  }
  if (isStraight) {
    return [CATEGORY.STRAIGHT, hiStraight];
  }
  if (groups[0][0] === 3) {
    // trips + top two kickers
    const trips = groups[0][1];
    const kickers = groups.filter(g => g[1] !== trips).map(g => g[1]).sort((a, b) => b - a).slice(0, 2);
    return [CATEGORY.THREE_OF_A_KIND, trips, ...kickers];
  }
  if (groups[0][0] === 2 && groups[1][0] === 2) {
    const hiPair = Math.max(groups[0][1], groups[1][1]);
    const loPair = Math.min(groups[0][1], groups[1][1]);
    const kicker = groups.find(g => g[0] === 1)[1];
    return [CATEGORY.TWO_PAIR, hiPair, loPair, kicker];
  }
  if (groups[0][0] === 2) {
    const pair = groups[0][1];
    const kickers = groups.filter(g => g[0] === 1).map(g => g[1]).sort((a, b) => b - a).slice(0, 3);
    return [CATEGORY.ONE_PAIR, pair, ...kickers];
  }
  // high card top5
  const top = ranks.slice().sort((a, b) => b - a);
  return [CATEGORY.HIGH_CARD, ...top];
}

function combinations5of7(cards7) {
  // yield arrays of 5 indices; precompute 21 combos
  const res = [];
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 4; b++)
      for (let c = b + 1; c < 5; c++)
        for (let d = c + 1; d < 6; d++)
          for (let e = d + 1; e < 7; e++) res.push([a, b, c, d, e]);
  return res.map(idx => idx.map(i => cards7[i]));
}

const PRECOMB_5OF7 = combinations5of7([0,1,2,3,4,5,6]);

function evaluateBest7(cardIds7) {
  let best = null;
  for (const idxs of PRECOMB_5OF7) {
    const five = idxs.map(i => cardIds7[i]);
    const vec = evaluate5(five);
    if (!best || compareVec(vec, best) > 0) best = vec;
  }
  return best;
}

function compareVec(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function vecToName(vec) {
  const cat = vec[0];
  const rankName = (ri) => RANKS[ri];
  switch (cat) {
    case CATEGORY.STRAIGHT_FLUSH: return `Стрит‑флеш ${rankName(vec[1])}‑high`;
    case CATEGORY.FOUR_OF_A_KIND: return `Каре ${rankName(vec[1])}`;
    case CATEGORY.FULL_HOUSE: return `Фулл‑хаус ${rankName(vec[1])} над ${rankName(vec[2])}`;
    case CATEGORY.FLUSH: return `Флеш`;
    case CATEGORY.STRAIGHT: return `Стрит ${rankName(vec[1])}‑high`;
    case CATEGORY.THREE_OF_A_KIND: return `Сет ${rankName(vec[1])}`;
    case CATEGORY.TWO_PAIR: return `Две пары ${rankName(vec[1])} и ${rankName(vec[2])}`;
    case CATEGORY.ONE_PAIR: return `Пара ${rankName(vec[1])}`;
    default: return `Старшая карта ${rankName(vec[1])}`;
  }
}

async function runMonteCarlo() {
  const sel = gatherSelection();
  const hero = [sel.h1, sel.h2].filter(Boolean);
  if (hero.length !== 2) {
    alert("Выберите две карманные карты.");
    return;
  }
  const board = [sel.b1, sel.b2, sel.b3, sel.b4, sel.b5].filter(Boolean);
  const opponents = parseInt(opponentsInput.value, 10);
  const totalIters = parseInt(iterationsInput.value, 10);

  cancelRun = false;
  btnCalc.disabled = true;
  btnRandom.disabled = true;
  btnClear.disabled = true;
  progressBar.style.width = "0%";
  updateStats(null);

  let wins = 0, ties = 0, losses = 0;

  const known = new Set([...hero, ...board]);
  // Pre-render hand strength name for current known best 7 if board full
  if (board.length === 5) {
    const vec = evaluateBest7([...hero, ...board]);
    handName.textContent = vecToName(vec);
  }

  const chunk = Math.max(100, Math.floor(totalIters / 25));
  const start = performance.now();

  for (let done = 0; done < totalIters && !cancelRun; ) {
    const upto = Math.min(totalIters, done + chunk);
    for (; done < upto; done++) {
      // fresh deck
      const deck = makeDeckIds().filter(id => !known.has(id));

      // fill missing board
      const curBoard = board.slice();
      while (curBoard.length < 5) curBoard.push(drawRandom(deck));

      // opponents hands
      const villains = [];
      for (let p = 0; p < opponents; p++) {
        const c1 = drawRandom(deck);
        const c2 = drawRandom(deck);
        villains.push([c1, c2]);
      }

      const heroVec = evaluateBest7([...hero, ...curBoard]);
      let bestVsAll = true;
      let tieWithSomeone = false;
      for (const opp of villains) {
        const oppVec = evaluateBest7([...opp, ...curBoard]);
        const cmp = compareVec(heroVec, oppVec);
        if (cmp < 0) { bestVsAll = false; break; }
        if (cmp === 0) tieWithSomeone = true;
      }
      if (bestVsAll) {
        if (tieWithSomeone) ties++; else wins++;
      } else {
        losses++;
      }
    }
    const progress = Math.round((done / totalIters) * 100);
    progressBar.style.width = `${progress}%`;
    updateStats({
      winPct: (wins / done) * 100,
      tiePct: (ties / done) * 100,
      losePct: (losses / done) * 100,
      wins, ties, losses, total: done,
    });
    await new Promise(r => setTimeout(r, 0));
  }

  const elapsedMs = Math.round(performance.now() - start);
  runInfo.textContent += ` · ${elapsedMs} мс`;
  btnCalc.disabled = false;
  btnRandom.disabled = false;
  btnClear.disabled = false;
}

function randomDeal() {
  clearAllSlots();
  const deck = makeDeckIds();
  const used = new Set();
  function take() {
    let id = drawRandom(deck);
    while (used.has(id)) id = drawRandom(deck);
    used.add(id);
    return id;
  }
  setSlotCard("h1", take());
  setSlotCard("h2", take());
  // flop, turn, river
  setSlotCard("b1", take());
  setSlotCard("b2", take());
  setSlotCard("b3", take());
  setSlotCard("b4", take());
  setSlotCard("b5", take());
  updateHandName();
}

function initSlots() {
  document.querySelectorAll('.card-slot').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const slotId = el.getAttribute('data-slot');
      openPicker(slotId);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const slotId = el.getAttribute('data-slot');
      setSlotCard(slotId, "");
      updateHandName();
    });
  });
}

function initPicker() {
  pickerBackdrop.addEventListener('click', (e) => {
    if (e.target === pickerBackdrop) closePicker();
  });
  pickerClose.addEventListener('click', closePicker);
  pickerClear.addEventListener('click', () => {
    if (activeSlot) setSlotCard(activeSlot, "");
    updateHandName();
    closePicker();
  });
}

function initControls() {
  opponentsInput.addEventListener('input', updateSliderLabels);
  iterationsInput.addEventListener('input', updateSliderLabels);
  updateSliderLabels();

  btnRandom.addEventListener('click', randomDeal);
  btnClear.addEventListener('click', clearAllSlots);
  btnCalc.addEventListener('click', () => { cancelRun = false; runMonteCarlo(); });
}

function main() {
  initSlots();
  initPicker();
  initControls();
}

window.addEventListener('DOMContentLoaded', main);
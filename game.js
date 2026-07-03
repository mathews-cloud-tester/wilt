"use strict";

// ---------- Tunables (from spec v0.1, with review decisions applied) ----------
const CONFIG = {
  boardSize: 6,
  totalTurns: 40,
  handSize: 3,
  bloomDuration: 2, // friendlier 2-turn bloom window
  minGroupForHuskClear: 3,
  seeds: {
    quick:    { name: "Quick",    growTime: 2, value: 1, weight: 45, emoji: "\u{1F33C}" },
    standard: { name: "Standard", growTime: 3, value: 3, weight: 40, emoji: "\u{1F338}" },
    slow:     { name: "Slow",     growTime: 5, value: 7, weight: 15, emoji: "\u{1FABB}" },
  },
};

// ---------- State ----------
let state = null;

function newGame() {
  state = {
    turn: 1,
    score: 0,
    grid: [], // each cell: {kind:'empty'} | {kind:'plant', seed, ticksToBloom, bloomLeft} | {kind:'husk'}
    hand: [],
    selectedHandIndex: null,
    over: false,
  };
  const n = CONFIG.boardSize;
  for (let i = 0; i < n * n; i++) state.grid.push({ kind: "empty" });
  for (let i = 0; i < CONFIG.handSize; i++) state.hand.push(drawSeed());
  state.selectedHandIndex = 0;
  render();
  setMessage("Select a seed, then tap an empty cell to plant it.");
}

function drawSeed() {
  const entries = Object.entries(CONFIG.seeds);
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [key, v] of entries) {
    r -= v.weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// ---------- Grid helpers ----------
const idx = (r, c) => r * CONFIG.boardSize + c;

function neighbors(i) {
  const n = CONFIG.boardSize;
  const r = Math.floor(i / n), c = i % n;
  const out = [];
  if (r > 0) out.push(idx(r - 1, c));
  if (r < n - 1) out.push(idx(r + 1, c));
  if (c > 0) out.push(idx(r, c - 1));
  if (c < n - 1) out.push(idx(r, c + 1));
  return out;
}

const isBlooming = (cell) => cell.kind === "plant" && cell.ticksToBloom === 0;
const bloomingIndices = () => state.grid.map((c, i) => (isBlooming(c) ? i : -1)).filter((i) => i >= 0);

// ---------- Actions (one per turn) ----------
function actPlant(cellIndex) {
  if (state.over) return;
  const cell = state.grid[cellIndex];
  if (cell.kind !== "empty" || state.selectedHandIndex === null) return;
  const seedKey = state.hand[state.selectedHandIndex];
  const seed = CONFIG.seeds[seedKey];
  state.grid[cellIndex] = {
    kind: "plant",
    seed: seedKey,
    ticksToBloom: seed.growTime,
    bloomLeft: CONFIG.bloomDuration,
  };
  state.hand[state.selectedHandIndex] = drawSeed();
  endTurn(`Planted ${seed.name} — blooms on turn ${state.turn + seed.growTime}.`);
}

function actHarvest() {
  if (state.over) return;
  const blooms = bloomingIndices();
  if (blooms.length === 0) return;

  // Partition blooms into orthogonally connected groups.
  const bloomSet = new Set(blooms);
  const visited = new Set();
  const groups = [];
  for (const start of blooms) {
    if (visited.has(start)) continue;
    const group = [];
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const i = stack.pop();
      group.push(i);
      for (const nb of neighbors(i)) {
        if (bloomSet.has(nb) && !visited.has(nb)) {
          visited.add(nb);
          stack.push(nb);
        }
      }
    }
    groups.push(group);
  }

  let turnScore = 0;
  let husksCleared = 0;
  for (const group of groups) {
    const sum = group.reduce((s, i) => s + CONFIG.seeds[state.grid[i].seed].value, 0);
    const groupScore = sum * group.length;
    turnScore += groupScore;
    spawnScorePopup(group, groupScore);
    // Husk relief valve: groups of 3+ clear adjacent husks.
    if (group.length >= CONFIG.minGroupForHuskClear) {
      for (const i of group) {
        for (const nb of neighbors(i)) {
          if (state.grid[nb].kind === "husk") {
            state.grid[nb] = { kind: "empty" };
            husksCleared++;
          }
        }
      }
    }
    for (const i of group) state.grid[i] = { kind: "empty" };
  }

  state.score += turnScore;
  const parts = [`Harvested ${blooms.length} bloom${blooms.length > 1 ? "s" : ""} for ${turnScore} points`];
  if (groups.length > 1) parts.push(`(${groups.length} separate groups)`);
  if (husksCleared > 0) parts.push(`— cleared ${husksCleared} husk${husksCleared > 1 ? "s" : ""}`);
  endTurn(parts.join(" ") + ".");
}

function actPass() {
  if (state.over) return;
  endTurn("Passed. The garden grows without you.");
}

// ---------- Turn advancement ----------
function endTurn(message) {
  if (state.turn >= CONFIG.totalTurns) {
    finishGame(message);
    return;
  }
  state.turn++;

  // Grow phase: age every plant.
  let wilted = 0;
  let newBlooms = 0;
  for (let i = 0; i < state.grid.length; i++) {
    const cell = state.grid[i];
    if (cell.kind !== "plant") continue;
    if (cell.ticksToBloom > 0) {
      cell.ticksToBloom--;
      if (cell.ticksToBloom === 0) newBlooms++;
    } else {
      cell.bloomLeft--;
      if (cell.bloomLeft <= 0) {
        state.grid[i] = { kind: "husk" };
        wilted++;
      }
    }
  }

  let msg = message;
  if (newBlooms > 0) msg += ` ${newBlooms} plant${newBlooms > 1 ? "s" : ""} just bloomed!`;
  if (wilted > 0) msg += ` ${wilted} bloom${wilted > 1 ? "s" : ""} wilted into husks.`;
  render();
  setMessage(msg);
}

function finishGame(lastMessage) {
  state.over = true;
  render();
  setMessage(lastMessage);
  const best = Math.max(state.score, getBest());
  localStorage.setItem("wilt-best", String(best));
  document.getElementById("finalScore").textContent = state.score;
  const husks = state.grid.filter((c) => c.kind === "husk").length;
  document.getElementById("overlayDetail").textContent =
    husks > 0
      ? `You left ${husks} husk${husks > 1 ? "s" : ""} in the garden.`
      : "A spotless garden. Impressive.";
  document.getElementById("overlay").classList.remove("hidden");
}

function getBest() {
  return parseInt(localStorage.getItem("wilt-best") || "0", 10);
}

// ---------- Rendering ----------
const boardEl = document.getElementById("board");
const handEl = document.getElementById("hand");

function render() {
  boardEl.style.gridTemplateColumns = `repeat(${CONFIG.boardSize}, 1fr)`;
  boardEl.innerHTML = "";
  state.grid.forEach((cell, i) => {
    const el = document.createElement("button");
    el.className = "cell";
    el.dataset.index = i;
    if (cell.kind === "empty") {
      el.classList.add("empty");
      if (!state.over && state.selectedHandIndex !== null) el.classList.add("plantable");
    } else if (cell.kind === "husk") {
      el.classList.add("husk");
      el.innerHTML = `<span class="cell-emoji">\u{1F342}</span>`;
      el.title = "Husk — blocks this cell";
    } else {
      const seed = CONFIG.seeds[cell.seed];
      el.classList.add("plant", cell.seed);
      if (isBlooming(cell)) {
        el.classList.add("blooming");
        if (cell.bloomLeft === 1) el.classList.add("last-chance");
        el.innerHTML = `<span class="cell-emoji">${seed.emoji}</span><span class="cell-tag bloom-tag">+${seed.value}</span>`;
        el.title = `Blooming! Worth ${seed.value}. ${cell.bloomLeft} turn${cell.bloomLeft > 1 ? "s" : ""} before it wilts.`;
      } else {
        el.innerHTML = `<span class="cell-emoji seedling">\u{1F331}</span><span class="cell-tag countdown">${cell.ticksToBloom}</span>`;
        el.title = `${seed.name} — blooms in ${cell.ticksToBloom} turn${cell.ticksToBloom > 1 ? "s" : ""}`;
      }
    }
    el.addEventListener("click", () => actPlant(i));
    boardEl.appendChild(el);
  });

  handEl.innerHTML = "";
  state.hand.forEach((seedKey, i) => {
    const seed = CONFIG.seeds[seedKey];
    const el = document.createElement("button");
    el.className = `seed-card ${seedKey}` + (i === state.selectedHandIndex ? " selected" : "");
    el.innerHTML = `
      <span class="seed-emoji">${seed.emoji}</span>
      <span class="seed-name">${seed.name}</span>
      <span class="seed-info">blooms in ${seed.growTime} &middot; worth ${seed.value}</span>`;
    el.addEventListener("click", () => {
      state.selectedHandIndex = i;
      render();
      setMessage(`${seed.name} selected — plants now, blooms on turn ${state.turn + seed.growTime}.`);
    });
    handEl.appendChild(el);
  });

  document.getElementById("turn").textContent = state.turn;
  document.getElementById("score").textContent = state.score;
  document.getElementById("best").textContent = Math.max(getBest(), state.score);

  const blooms = bloomingIndices().length;
  const harvestBtn = document.getElementById("harvestBtn");
  harvestBtn.disabled = state.over || blooms === 0;
  harvestBtn.textContent = blooms > 0 ? `Harvest (${blooms})` : "Harvest";
  document.getElementById("passBtn").disabled = state.over;
}

function setMessage(msg) {
  document.getElementById("message").textContent = msg;
}

function spawnScorePopup(group, score) {
  // Anchor the popup on the first cell of the group.
  const cellEl = boardEl.querySelector(`[data-index="${group[0]}"]`);
  if (!cellEl) return;
  const pop = document.createElement("div");
  pop.className = "score-pop";
  pop.textContent = `+${score}`;
  const rect = cellEl.getBoundingClientRect();
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);
}

// ---------- Wire up ----------
document.getElementById("harvestBtn").addEventListener("click", actHarvest);
document.getElementById("passBtn").addEventListener("click", actPass);
document.getElementById("restartBtn").addEventListener("click", () => {
  document.getElementById("overlay").classList.add("hidden");
  newGame();
});

document.addEventListener("keydown", (e) => {
  if (state.over) return;
  if (e.key === "h" || e.key === "H") actHarvest();
  if (e.key === "p" || e.key === "P" || e.key === " ") actPass();
  if (e.key === "1" || e.key === "2" || e.key === "3") {
    state.selectedHandIndex = parseInt(e.key, 10) - 1;
    render();
  }
});

newGame();

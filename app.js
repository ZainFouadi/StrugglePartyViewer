/* WarEra party roster tool - static, no build step. Works on GitHub Pages. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- config
  const PARAMS = new URLSearchParams(location.search);
  const CFG = {
    partyId: PARAMS.get("party") || "6a73c35d9b7e078fa6f4c1dc",
    refreshMs: 10 * 60 * 1000,
    concurrency: 4,
    companiesPerPage: 15,
    onlineMins: 15,
    muTtlMs: 24 * 60 * 60 * 1000,
    defaultBases: ["https://api6.warera.io", "https://api5.warera.io"],
  };
  const SORTS = { // key: [default direction, label when desc, label when asc]
    level: ["desc", "High to low", "Low to high"],
    mu: ["asc", "Z to A", "A to Z"],
    wealth: ["desc", "Richest first", "Poorest first"],
    seen: ["desc", "Newest first", "Oldest first"],
  };
    const LS = { token: "wr_token", base: "wr_api_base", mu: "wr_mu_cache" };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    json(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
  };

  // ---------------------------------------------------------------- icons (game's MDI paths)
  const P = {
    sword: "M18.8025 2.44L6.9025 14.34L4.7825 12.22L3.3725 13.63L5.8425 16.1L2.6625 19.28C2.2725 19.67 2.2725 20.3 2.6625 20.69L3.3725 21.4C3.7625 21.79 4.3925 21.79 4.7825 21.4L8.0025 18.23L10.4425 20.7L11.8525 19.29L9.7325 17.17L21.6325 5.27V2.44H18.8025Z",
    converge: "M19.5,3.09L20.91,4.5L16.41,9H20V11H13V4H15V7.59L19.5,3.09M20.91,19.5L19.5,20.91L15,16.41V20H13V13H20V15H16.41L20.91,19.5M4.5,3.09L9,7.59V4H11V11H4V9H7.59L3.09,4.5L4.5,3.09M3.09,19.5L7.59,15H4V13H11V20H9V16.41L4.5,20.91L3.09,19.5Z",
    burst: "M4.35 21H21V4.35L17.85 12L15.5 5L14.25 10.2L3 3L10.2 14.25L4.5 15.5L12 17.85L4.35 21Z",
    target: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,10.84 21.79,9.69 21.39,8.61L19.79,10.21C19.93,10.8 20,11.4 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.6,4 13.2,4.07 13.79,4.21L15.4,2.6C14.31,2.21 13.16,2 12,2M19,2L15,6V7.5L12.45,10.05C12.3,10 12.15,10 12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12C14,11.85 14,11.7 13.95,11.55L16.5,9H18L22,5H19V2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12H16A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8V6Z",
    shield: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z",
    runner: "M16.5,5.5A2,2 0 0,0 18.5,3.5A2,2 0 0,0 16.5,1.5A2,2 0 0,0 14.5,3.5A2,2 0 0,0 16.5,5.5M12.9,19.4L13.9,15L16,17V23H18V15.5L15.9,13.5L16.5,10.5C17.89,12.09 19.89,13 22,13V11C20.24,11.03 18.6,10.11 17.7,8.6L16.7,7C16.34,6.4 15.7,6 15,6C14.7,6 14.5,6.1 14.2,6.1L9,8.3V13H11V9.6L12.8,8.9L11.2,17L6.3,16L5.9,18L12.9,19.4M4,9A1,1 0 0,1 3,8A1,1 0 0,1 4,7H7V9H4M5,5A1,1 0 0,1 4,4A1,1 0 0,1 5,3H10V5H5M3,13A1,1 0 0,1 2,12A1,1 0 0,1 3,11H7V13H3Z",
    heart: "M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z",
    chest: "M5,4H19A3,3 0 0,1 22,7V11H15V10H9V11H2V7A3,3 0 0,1 5,4M11,11H13V13H11V11M2,12H9V13L11,15H13L15,13V12H22V20H2V12Z",
    fork: "M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,6Z",
    bulb: "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
    bolt: "M11 15H6L13 1V9H18L11 23V15Z",
    hammer: "M14.79,10.62L3.5,21.9L2.1,20.5L13.38,9.21L14.79,10.62M19.27,7.73L19.86,7.14L19.07,6.35L19.71,5.71L18.29,4.29L17.65,4.93L16.86,4.14L16.27,4.73C14.53,3.31 12.57,2.17 10.47,1.37L9.64,3.16C11.39,4.08 13,5.19 14.5,6.5L14,7L17,10L17.5,9.5C18.81,11 19.92,12.61 20.84,14.36L22.63,13.53C21.83,11.43 20.69,9.47 19.27,7.73Z",
    factory: "M4,18V20H8V18H4M4,14V16H14V14H4M10,18V20H14V18H10M16,14V16H20V14H16M16,18V20H20V18H16M2,22V8L7,12V8L12,12V8L17,12L18,2H21L22,12V22H2Z",
    person: "M12 3C14.21 3 16 4.79 16 7S14.21 11 12 11 8 9.21 8 7 9.79 3 12 3M16 13.54C16 14.6 15.72 17.07 13.81 19.83L13 15L13.94 13.12C13.32 13.05 12.67 13 12 13S10.68 13.05 10.06 13.12L11 15L10.19 19.83C8.28 17.07 8 14.6 8 13.54C5.61 14.24 4 15.5 4 17V21H20V17C20 15.5 18.4 14.24 16 13.54Z",
    coins: "M12 5C7.031 5 2 6.546 2 9.5S7.031 14 12 14c4.97 0 10-1.546 10-4.5S16.97 5 12 5zm-5 9.938v3c1.237.299 2.605.482 4 .541v-3a21.166 21.166 0 0 1-4-.541zm6 .54v3a20.994 20.994 0 0 0 4-.541v-3a20.994 20.994 0 0 1-4 .541zm6-1.181v3c1.801-.755 3-1.857 3-3.297v-3c0 1.44-1.199 2.542-3 3.297zm-14 3v-3C3.2 13.542 2 12.439 2 11v3c0 1.439 1.2 2.542 3 3.297z",
    boxOpen: "M50.7 58.5L0 160l208 0 0-128L93.7 32C75.5 32 58.9 42.3 50.7 58.5zM240 160l208 0L397.3 58.5C389.1 42.3 372.5 32 354.3 32L240 32l0 128zm208 32L0 192 0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-224z",
    shirt: "M16,21H8A1,1 0 0,1 7,20V12.07L5.7,13.07C5.31,13.46 4.68,13.46 4.29,13.07L1.46,10.29C1.07,9.9 1.07,9.27 1.46,8.88L7.34,3H9C9,4.1 10.34,5 12,5C13.66,5 15,4.1 15,3H16.66L22.54,8.88C22.93,9.27 22.93,9.9 22.54,10.29L19.71,13.12C19.32,13.5 18.69,13.5 18.3,13.12L17,12.12V20A1,1 0 0,1 16,21",
    pistol: "M7,5H23V9H22V10H16A1,1 0 0,0 15,11V12A2,2 0 0,1 13,14H9.62C9.24,14 8.89,14.22 8.72,14.56L6.27,19.45C6.1,19.79 5.76,20 5.38,20H2C2,20 -1,20 3,14C3,14 6,10 2,10V5H3L3.5,4H6.5L7,5M14,12V11A1,1 0 0,0 13,10H12C12,10 11,11 12,12A2,2 0 0,1 10,10A1,1 0 0,0 9,11V12A1,1 0 0,0 10,13H13A1,1 0 0,0 14,12Z",
    sparkles: "M19,1L17.74,3.75L15,5L17.74,6.26L19,9L20.25,6.26L23,5L20.25,3.75M9,4L6.5,9.5L1,12L6.5,14.5L9,20L11.5,14.5L17,12L11.5,9.5M19,15L17.74,17.74L15,19L17.74,20.25L19,23L20.25,20.25L23,19L20.25,17.74",
    refresh: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
    warn: "M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z",
    key: "M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6C3.7 6 1 8.7 1 12S3.7 18 7 18C9.6 18 11.8 16.3 12.6 14H16V18H20V14H23V10H12.6Z",
    caret: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
    crown: "M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z",
    gavel: "M2.3,20.28L11.9,10.68L10.5,9.26L9.78,9.97C9.39,10.36 8.76,10.36 8.37,9.97L7.66,9.26C7.27,8.87 7.27,8.24 7.66,7.85L13.32,2.19C13.71,1.8 14.34,1.8 14.73,2.19L15.44,2.9C15.83,3.29 15.83,3.92 15.44,4.31L14.73,5L16.15,6.43C16.54,6.04 17.17,6.04 17.56,6.43C17.95,6.82 17.95,7.46 17.56,7.85L18.97,9.26L19.68,8.55C20.07,8.16 20.71,8.16 21.1,8.55L21.8,9.26C22.19,9.65 22.19,10.29 21.8,10.68L16.15,16.33C15.76,16.72 15.12,16.72 14.73,16.33L14.03,15.63C13.63,15.24 13.63,14.6 14.03,14.21L14.73,13.5L13.32,12.09L3.71,21.7C3.32,22.09 2.69,22.09 2.3,21.7C1.91,21.31 1.91,20.67 2.3,20.28M20,19A2,2 0 0,1 22,21V22H12V21A2,2 0 0,1 14,19H20Z",
    group: "M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z",
  };
  const VB = { boxOpen: "0 0 448 512" };
  const ic = (n, color) => `<svg class="wt-ic" viewBox="${VB[n] || "0 0 24 24"}" fill="currentColor"${color ? ` style="color:${color}"` : ""} aria-hidden="true"><path d="${P[n] || ""}"></path></svg>`;

  // ---------------------------------------------------------------- skills
  const SKILLS = [
    // key, label, icon, pct, cell-gradient top/bottom, icon colour, description (html)
    { k: "attack", l: "Attack", i: "sword", g: "combat", c: ["#7A3F1C", "#4E2610"], ic: "#F29A5B", d: `The base value for <em>${"Damages"}</em> calculation.` },
    { k: "precision", l: "Precision", i: "converge", pct: 1, g: "combat", c: ["#7A3F1C", "#4E2610"], ic: "#F29A5B", d: "Chance to hit the target.<br>Misses cannot crit, and deal half damage." },
    { k: "criticalChance", l: "Crit. chance", i: "burst", pct: 1, g: "combat", c: ["#7E2B2E", "#4F1819"], ic: "#F27C7F", d: "Probability of landing a critical hit" },
    { k: "criticalDamages", l: "Crit. damages", i: "target", pct: 1, g: "combat", c: ["#7E2B2E", "#4F1819"], ic: "#F27C7F", d: "The damage factor increase of critical hits over normal hits" },
    { k: "armor", l: "Armor", i: "shield", g: "combat", c: ["#2A5560", "#183640"], ic: "#8FD0DE", d: "Reduces health lost when fighting in battles" },
    { k: "dodge", l: "Dodge", i: "runner", g: "combat", c: ["#2A5560", "#183640"], ic: "#8FD0DE", d: "Chance to dodge all incoming damage when fighting in battles.<br>Dodging also prevents equipment durability from being consumed." },
    { k: "health", l: "Health", i: "heart", g: "combat", c: ["#2D7249", "#194A2E"], ic: "#8EE0AB", d: "Consumed when fighting in battles" },
    { k: "lootChance", l: "Loot chance", i: "chest", pct: 1, g: "combat", c: ["#2A6650", "#17402F"], ic: "#8EE0C0", d: "Chance per hit to instantly loot.<br>Each 1% gives 1% of an item and 0.01% to loot cases per hit." },
    { k: "hunger", l: "Hunger", i: "fork", g: "combat", c: ["#7E2B2E", "#4F1819"], ic: "#F27C7F", d: "Limit of food consumption" },
    { k: "entrepreneurship", l: "Entrepreneurship", i: "bulb", g: "eco", c: ["#4F3680", "#2E1F4F"], ic: "#C3A4F0", d: `Used to <em>Self Work</em> in your own companies` },
    { k: "energy", l: "Energy", i: "bolt", g: "eco", c: ["#2B4A82", "#182C52"], ic: "#8FB5F5", d: `Used to <em>Work</em>` },
    { k: "production", l: "Production", i: "hammer", g: "eco", c: ["#7A5E1C", "#4C3A10"], ic: "#F0CF7A", d: `The <em>Production Points</em> you generate each time you work` },
    { k: "companies", l: "Companies limit", i: "factory", g: "eco", c: ["#6E5220", "#44320F"], ic: "#E8C77A", d: "Amount of companies you can own" },
    { k: "management", l: "Management", i: "person", g: "eco", c: ["#4F3680", "#2E1F4F"], ic: "#C3A4F0", d: `Amount of <em>Workers</em> you can manage. And daily hire limit.` },
  ];
  const MAX_CELLS = 10;
  const sp = (lvl) => { lvl = Number(lvl) || 0; return lvl * (lvl + 1) / 2; }; // points spent on a skill level (1+2+...+L)

  function classify(user) {
    const sk = (user && user.skills) || {};
    let c = 0, e = 0;
    SKILLS.forEach((s) => { const pts = sp(sk[s.k] && sk[s.k].level); if (s.g === "combat") c += pts; else e += pts; });
    const total = c + e;
    if (!total) return { type: "none", c, e, share: 0 };
    const share = c / total;
    return { type: share >= 0.6 ? "combat" : share <= 0.4 ? "eco" : "hybrid", c, e, share };
  }
  const TYPE = {
    combat: { label: "Combat", icons: ["sword"] },
    eco: { label: "Economic", icons: ["coins"] },
    hybrid: { label: "Hybrid", icons: ["sword", "coins"] },
    none: { label: "No points", icons: [] },
  };

  // ---------------------------------------------------------------- helpers
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtNum = (n) => (n == null || n === "" || isNaN(Number(n))) ? "-" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  function fmtShort(n) {
    if (n == null || isNaN(Number(n))) return "-";
    n = Number(n); const a = Math.abs(n);
    const t = (x) => x.toFixed(2).replace(/\.?0+$/, "");
    if (a >= 1e9) return t(n / 1e9) + "B";
    if (a >= 1e6) return t(n / 1e6) + "M";
    if (a >= 1e3) return t(n / 1e3) + "K";
    return t(n);
  }
  function relShort(iso) {
    if (!iso) return "-";
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "now";
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    const d = Math.floor(h / 24);
    return d < 60 ? d + "d" : Math.floor(d / 30) + "mo";
  }
  const minsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 60000 : Infinity;
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "-";
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  // ---------------------------------------------------------------- API
  class ApiError extends Error { constructor(kind, msg) { super(msg); this.kind = kind; } }

  const getToken = () => (store.get(LS.token, "") || "").trim().replace(/^Bearer\s+/i, "");
  function tokenExpired(t) {
    try { const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); return p.exp && Date.now() > p.exp * 1000; } catch (e) { return false; }
  }
  function bases() {
    const custom = (store.get(LS.base, "") || "").trim().replace(/\/+$/, "");
    return custom ? [custom] : CFG.defaultBases;
  }

  // Some tRPC servers wrap data as {json: ...} (superjson). Unwrap it transparently.
  const unwrap = (d) => (d && typeof d === "object" && !Array.isArray(d) && "json" in d && Object.keys(d).every((k) => k === "json" || k === "meta")) ? d.json : d;

  const LOG = []; // last API calls, shown in the diagnostics report
  function logCall(proc, base, status, t0, err) {
    LOG.push({ at: new Date().toISOString(), proc, base, status, ms: Math.round(performance.now() - t0), err: err || "" });
    if (LOG.length > 40) LOG.shift();
  }

  // ---- rate limiter: the API allows ~100 requests/minute (anonymous) - never exceed it, and wait politely on HTTP 429
  const RL = { limit: 80, windowMs: 60000, stamps: [], blockedUntil: 0 };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function waitLabel() { /* waiting for the rate limit is silent - nothing is shown to the visitor */ }
  async function rlTake() {
    for (;;) {
      const now = Date.now();
      RL.stamps = RL.stamps.filter((t) => now - t < RL.windowMs);
      if (now < RL.blockedUntil) { waitLabel(RL.blockedUntil - now); await sleep(Math.min(1000, RL.blockedUntil - now)); continue; }
      if (RL.stamps.length < RL.limit) { RL.stamps.push(now); return; }
      const wait = RL.stamps[0] + RL.windowMs - now + 50;
      waitLabel(wait); await sleep(Math.min(1000, wait));
    }
  }
  async function fetchRL(base, proc, input, token, t0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      await rlTake();
      const res = await fetch(`${base}/trpc/${proc}?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ "0": input || {} }),
      });
      let json; try { json = await res.json(); } catch (e) { json = undefined; }
      const first = Array.isArray(json) ? json[0] : json;
      const limited = res.status === 429 || (first && first.status === 429);
      logCall(proc, base, res.status, t0, limited ? "rate limited" : (json === undefined ? "non-JSON body" : ""));
      if (!limited) return { res, json };
      const m = /limit is (\d+)/i.exec((first && first.message) || "");
      if (m) RL.limit = Math.max(10, Math.floor(Number(m[1]) * 0.8));       // learn the real limit
      const ra = Number(res.headers.get("retry-after"));
      RL.blockedUntil = Date.now() + (ra > 0 ? ra * 1000 : 8000 + attempt * 6000);
      RL.stamps = RL.stamps.concat(Array(Math.max(0, RL.limit - RL.stamps.length)).fill(Date.now())); // window is full: wait it out
    }
    throw new ApiError("api", "Rate limit exceeded (HTTP 429). Too many requests - wait a minute and refresh.");
  }

  async function call(proc, input) {
    const token = getToken();
    if (!token) throw new ApiError("auth", "No token");
    let last;
    for (const base of bases()) {
      const t0 = performance.now();
      try {
        const { res, json } = await fetchRL(base, proc, input, token, t0);
        if (json === undefined) throw new ApiError("api", `${proc}: HTTP ${res.status} (not JSON)`);
        const first = Array.isArray(json) ? json[0] : json;
        if (first && first.error) {
          const msg = (first.error.json && first.error.json.message) || first.error.message || "API error";
          const code = (first.error.json && first.error.json.data && first.error.json.data.code) || "";
          throw new ApiError(res.status === 401 || /UNAUTH/i.test(code) ? "auth" : "api", `${proc}: ${msg}`);
        }
        if (res.status === 401) throw new ApiError("auth", "Unauthorized");
        if (first && first.result && "data" in first.result) return unwrap(first.result.data);
        return unwrap(first);
      } catch (e) {
        if (!(e instanceof ApiError)) logCall(proc, base, 0, t0, String(e && e.message || e));
        if (e instanceof ApiError) { if (e.kind !== "net") throw e; last = e; }
        else last = new ApiError("net", "Network request failed (blocked by CORS, offline, or wrong API address)");
      }
    }
    throw last;
  }

  async function retry(fn, tries = 3) {
    let err;
    for (let i = 0; i < tries; i++) {
      try { return await fn(); }
      catch (e) { err = e; if (e.kind === "auth") throw e; await new Promise((r) => setTimeout(r, 700 * (i + 1))); }
    }
    throw err;
  }

  async function pool(items, limit, worker, onStep) {
    let i = 0, done = 0;
    const run = async () => {
      while (i < items.length) {
        const idx = i++;
        try { await worker(items[idx], idx); } catch (e) { if (e && e.kind === "auth") throw e; }
        done++;
        if (onStep) onStep(done, items.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  }

  // ---------------------------------------------------------------- state
  const S = {
    party: null,
    roles: new Map(),          // userId -> {leader, treasurer, council}
    players: new Map(),        // userId -> {id, user, error, co}
    mu: store.json(LS.mu, {}), // muId -> {name, t}
    open: new Set(),
    f: Object.assign({ q: "", mu: "all", type: "all", sort: "level", dir: "desc" }, store.json("wr_sort", {})),
    loading: false,
    lastOk: 0,
    lastStart: 0,
    cachedAt: 0,
  };
  if (!SORTS[S.f.sort]) { S.f.sort = "level"; S.f.dir = "desc"; } // stale saved choice

  // ---------------------------------------------------------------- cache (survives page reloads)
  const CACHE_KEY = "wr_cache_" + CFG.partyId;
  function slimUser(u) {
    const sk = {};
    Object.keys(u.skills || {}).forEach((k) => { const d = u.skills[k] || {}; sk[k] = { level: d.level, value: d.value, total: d.total, weapon: d.weapon, equipment: d.equipment }; });
    const l = u.leveling || {};
    return { _id: u._id, username: u.username, avatarUrl: u.avatarUrl, mu: u.mu || null,
      leveling: { level: l.level, totalXp: l.totalXp, spentSkillPoints: l.spentSkillPoints, availableSkillPoints: l.availableSkillPoints },
      dates: { lastConnectionAt: u.dates && u.dates.lastConnectionAt }, skills: sk, stats: { wealth: (u.stats && u.stats.wealth) || {} } };
  }
  let saveT = 0;
  function saveCache() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (!S.party) return;
      try {
        const players = [];
        S.players.forEach((p) => { if (p.user) players.push({ id: p.id, user: slimUser(p.user), co: p.co && p.co.state === "ok" ? { items: p.co.items, at: p.co.at } : null }); });
        const pr = S.party;
        store.set(CACHE_KEY, JSON.stringify({ t: S.lastOk || Date.now(), party: { name: pr.name, description: pr.description, avatarUrl: pr.avatarUrl, leader: pr.leader, treasurer: pr.treasurer, councilMembers: pr.councilMembers, members: pr.members }, players }));
      } catch (e) { /* storage full: ignore */ }
    }, 400);
  }
  function loadCache() {
    const c = store.json(CACHE_KEY, null);
    if (!c || !c.party || !Array.isArray(c.party.members)) return false;
    S.party = c.party;
    S.roles = new Map();
    const mk = () => ({ leader: false, treasurer: false, council: false });
    c.party.members.forEach((id) => S.roles.set(id, mk()));
    const mark = (id, k) => { if (!S.roles.has(id)) S.roles.set(id, mk()); S.roles.get(id)[k] = true; };
    if (c.party.leader) mark(c.party.leader, "leader");
    if (c.party.treasurer) mark(c.party.treasurer, "treasurer");
    (c.party.councilMembers || []).forEach((id) => mark(id, "council"));
    (c.players || []).forEach((x) => S.players.set(x.id, { id: x.id, user: x.user, error: null, co: x.co ? { state: "ok", items: x.co.items || [], at: x.co.at } : null }));
    S.cachedAt = c.t || 0;
    return true;
  }

  // ---------------------------------------------------------------- loading
  async function refresh(manual) {
    if (S.loading) return;
    if (!getToken()) { openTokenModal("Enter your in-game token to load the party."); return; }
    if (tokenExpired(getToken())) { openTokenModal("Your token has expired. Enter a new one."); return; }
    S.loading = true; S.lastStart = Date.now();
    setNotice("");
    paintBar();
    try {
      progress(0, 1, "Loading party...");
      const party = await retry(() => call("party.getById", { partyId: CFG.partyId }));
      if (!party || !Array.isArray(party.members)) {
        throw new ApiError("api", "Unexpected party response (no members list). Keys: " + (party && typeof party === "object" ? Object.keys(party).join(", ") || "none" : typeof party) + ". Open Diagnostics (Ctrl+Shift+D) and copy the report.");
      }
      S.party = party;
      S.roles = new Map();
      (party.members || []).forEach((id) => S.roles.set(id, { leader: false, treasurer: false, council: false }));
      const mark = (id, k) => { if (!S.roles.has(id)) S.roles.set(id, { leader: false, treasurer: false, council: false }); S.roles.get(id)[k] = true; };
      if (party.leader) mark(party.leader, "leader");
      if (party.treasurer) mark(party.treasurer, "treasurer");
      (party.councilMembers || []).forEach((id) => mark(id, "council"));
      paintHero();

      const ids = Array.from(S.roles.keys());
      for (const id of Array.from(S.players.keys())) if (!S.roles.has(id)) S.players.delete(id); // left the party
      let paintQueued = false;
      const queuePaint = () => { if (paintQueued) return; paintQueued = true; requestAnimationFrame(() => { paintQueued = false; paintAll(); }); };

      await pool(ids, CFG.concurrency, async (id) => {
        try {
          const user = await retry(() => call("user.getUserById", { userId: id }));
          const p = S.players.get(id) || { id, co: null };
          p.user = user; p.error = null;
          S.players.set(id, p);
        } catch (e) {
          if (e.kind === "auth") throw e;
          const p = S.players.get(id) || { id, co: null };
          if (!p.user) p.error = e.message;   // keep the previous (cached) data if we have it
          S.players.set(id, p);
        }
      }, (d, t) => { progress(d, t, `Loading players ${d}/${t}`); if (d % 6 === 0) queuePaint(); });

      // MU names
      const need = new Set();
      S.players.forEach((p) => { const m = p.user && p.user.mu; if (m && !(S.mu[m] && Date.now() - S.mu[m].t < CFG.muTtlMs)) need.add(m); });
      const list = Array.from(need);
      if (list.length) {
        await pool(list, CFG.concurrency, async (muId) => {
          const d = await retry(() => call("mu.getById", { muId }));
          S.mu[muId] = { name: (d && d.name) || "?", t: Date.now() };
        }, (d, t) => progress(d, t, `Loading MUs ${d}/${t}`));
        store.set(LS.mu, JSON.stringify(S.mu));
      }

      // companies that were already loaded -> keep them fresh
      const reload = Array.from(S.players.values()).filter((p) => p.co && p.co.state === "ok");
      if (reload.length) await pool(reload, CFG.concurrency, (p) => loadCompanies(p.id, true), (d, t) => progress(d, t, `Refreshing companies ${d}/${t}`));

      S.lastOk = Date.now();
      saveCache();
    } catch (e) {
      handleError(e);
    } finally {
      S.loading = false;
      progress(0, 0);
      paintAll();
    }
  }

  async function loadCompanies(id, quiet) {
    const p = S.players.get(id);
    if (!p) return;
    if (p.co && p.co.state === "loading") return;
    const prev = p.co;
    p.co = { state: "loading", items: prev ? prev.items : [] };
    if (!quiet) paintOne(id);
    try {
      const d = await retry(() => call("company.getCompanies", { userId: id, perPage: CFG.companiesPerPage }));
      const ids = ((d && d.items) || []).map((c) => (typeof c === "object" && c ? (c._id || c.id) : c));
      const items = ids.map((cid) => ({ id: cid, itemCode: null, name: null, total: null }));
      await pool(items, 3, async (it) => {
        const [info, bonus] = await Promise.allSettled([
          retry(() => call("company.getById", { companyId: it.id })),
          retry(() => call("company.getProductionBonus", { companyId: it.id })),
        ]);
        if (info.status === "fulfilled" && info.value) { it.itemCode = info.value.itemCode || null; it.name = info.value.name || null; }
        else if (info.status === "rejected" && info.reason && info.reason.kind === "auth") throw info.reason;
        if (bonus.status === "fulfilled" && bonus.value) it.total = bonus.value.total != null ? bonus.value.total : null;
        else if (bonus.status === "rejected" && bonus.reason && bonus.reason.kind === "auth") throw bonus.reason;
        if (info.status === "rejected" && bonus.status === "rejected") it.err = (info.reason && info.reason.message) || "Failed";
      });
      p.co = { state: "ok", items, at: Date.now() };
      saveCache();
    } catch (e) {
      if (e.kind === "auth") { handleError(e); p.co = prev && prev.state === "ok" ? prev : { state: "idle", items: [] }; }
      else if (prev && prev.state === "ok") p.co = prev;              // keep what we already had
      else p.co = { state: "error", items: [], error: e.message };
    }
    if (!quiet) paintOne(id);
  }

  // ---------------------------------------------------------------- errors / notices
  function setNotice(html) { $("notice").innerHTML = html || ""; }
  function handleError(e) {
    if (e && e.kind === "auth") { openTokenModal("The API rejected your token. Enter a fresh one."); return; }
    if (e && e.kind === "net") {
      setNotice(`<div class="bn">${ic("warn")}<div><b>Can't reach the WarEra API from this page.</b><br>
        The browser blocked the request (usually CORS), or you are offline. Fix: deploy the small proxy in <b>worker.js</b> (Cloudflare Workers, free) and paste its address in the connection settings.
        <br><button class="btn" type="button" id="nOpen">${ic("key")}Connection settings</button></div></div>`);
      const b = $("nOpen"); if (b) b.onclick = () => openTokenModal();
      return;
    }
    setNotice(`<div class="bn">${ic("warn")}<div>${esc((e && e.message) || "Unknown error")}</div></div>`);
  }

  function progress(d, t, label) {
    const box = $("prog");
    if (!t || !S.loading) { box.hidden = true; return; }   // only visible while the main refresh runs
    box.hidden = false;
    box.firstElementChild.style.width = Math.round((d / t) * 100) + "%";
    box.lastElementChild.textContent = label || "";
  }

  // ---------------------------------------------------------------- derived data
  const roleOf = (id) => S.roles.get(id) || {};
  const rolePri = (r) => r.leader ? 0 : r.treasurer ? 1 : r.council ? 2 : 3;
  const muName = (p) => {
    const m = p.user && p.user.mu;
    return m ? ((S.mu[m] && S.mu[m].name) || "...") : null;
  };
  const wealthOf = (u) => u && u.stats && u.stats.wealth ? Number(u.stats.wealth.total) || 0 : 0;

  function visiblePlayers() {
    const f = S.f, q = f.q.trim().toLowerCase();
    const arr = Array.from(S.players.values()).filter((p) => {
      const u = p.user;
      if (!u) return !q && f.mu === "all" && f.type === "all"; // keep error rows visible when unfiltered
      if (q && !String(u.username || "").toLowerCase().includes(q)) return false;
      if (f.mu === "none" && u.mu) return false;
      if (f.mu !== "all" && f.mu !== "none" && u.mu !== f.mu) return false;
      if (f.type !== "all" && classify(u).type !== f.type) return false;
      return true;
    });
    const lvl = (p) => (p.user && p.user.leveling && p.user.leveling.level) || 0;
    const xp = (p) => (p.user && p.user.leveling && p.user.leveling.totalXp) || 0;
    const seen = (p) => (p.user && p.user.dates && p.user.dates.lastConnectionAt) ? new Date(p.user.dates.lastConnectionAt).getTime() : 0;
    const name = (p) => String((p.user && p.user.username) || "").toLowerCase();
    const mu = (p) => (muName(p) || "");
    // every comparator is ASCENDING; direction is applied below, ties fall back to name
    const asc = {
      level: (a, b) => lvl(a) - lvl(b) || xp(a) - xp(b),
      seen: (a, b) => seen(a) - seen(b),
      wealth: (a, b) => wealthOf(a.user) - wealthOf(b.user),
      mu: (a, b) => mu(a).localeCompare(mu(b)),
    }[f.sort] || (() => 0);
    const sign = f.dir === "desc" ? -1 : 1;
    const cmp = (a, b) => {
      if (f.sort === "mu") { const ea = !mu(a), eb = !mu(b); if (ea !== eb) return ea ? 1 : -1; } // players without MU always last
      return sign * asc(a, b) || name(a).localeCompare(name(b));
    };
    return arr.sort(cmp);
  }

  // ---------------------------------------------------------------- rendering
  const tile = (v, label, icon, value) => `<div class="wt-t v-${v}"><div class="tl">${esc(label)}</div><div class="tv">${ic(icon)}<span>${esc(value)}</span></div></div>`;
  const sec = (label, icon, extra) => `<div class="sec">${ic(icon)}<span>${esc(label)}</span>${extra || ""}</div>`;

  function paintHero() {
    const p = S.party;
    if (!p) return;
    if (p.name) { $("pName").textContent = p.name; document.title = p.name + " — Party Roster"; }
    $("pDesc").textContent = p.description || "";
    const av = $("pAvatar");
    if (p.avatarUrl) { av.src = String(p.avatarUrl).replace(/["\]\[]+$/g, ""); av.hidden = false; }
  }

  function paintStats() {
    const all = Array.from(S.players.values()).filter((p) => p.user);
    const cnt = { combat: 0, eco: 0, hybrid: 0 };
    let lv = 0, online = 0, inMu = 0;
    all.forEach((p) => {
      const t = classify(p.user).type; if (cnt[t] != null) cnt[t]++;
      lv += (p.user.leveling && p.user.leveling.level) || 0;
      if (minsSince(p.user.dates && p.user.dates.lastConnectionAt) <= CFG.onlineMins) online++;
      if (p.user.mu) inMu++;
    });
    const members = S.party ? (S.party.members || []).length : all.length;
    $("stats").innerHTML =
      tile("g", "Members", "person", members) +
      tile("p", "Avg level", "sparkles", all.length ? (lv / all.length).toFixed(1) : "-") +
      tile("g", "Online now", "bolt", online) +
      tile("r", "Combat", "sword", cnt.combat) +
      tile("y", "Economic", "coins", cnt.eco) +
      tile("p", "Hybrid", "converge", cnt.hybrid);
  }

  function paintBar() {
    // type segmented buttons with counts
    const all = Array.from(S.players.values()).filter((p) => p.user);
    const cnt = { all: all.length, combat: 0, eco: 0, hybrid: 0 };
    all.forEach((p) => { const t = classify(p.user).type; if (cnt[t] != null) cnt[t]++; });
    const defs = [["all", "All", null], ["combat", "Combat", "sword"], ["eco", "Economic", "coins"], ["hybrid", "Hybrid", "converge"]];
    $("fType").innerHTML = defs.map(([k, l, i]) => `<button type="button" data-t="${k}" class="${S.f.type === k ? "on" : ""}">${i ? ic(i) : ""}${l} <small>${cnt[k]}</small></button>`).join("");

    // MU select with counts
    const muCount = new Map(); let none = 0;
    all.forEach((p) => { const m = p.user.mu; if (m) muCount.set(m, (muCount.get(m) || 0) + 1); else none++; });
    const opts = Array.from(muCount.entries()).map(([id, n]) => [id, (S.mu[id] && S.mu[id].name) || "...", n]).sort((a, b) => b[2] - a[2] || a[1].localeCompare(b[1]));
    const cur = S.f.mu;
    $("fMu").innerHTML = `<option value="all">All MUs (${all.length})</option><option value="none">No MU (${none})</option>` +
      opts.map(([id, n, c]) => `<option value="${esc(id)}">${esc(n)} (${c})</option>`).join("");
    $("fMu").value = cur;
    if ($("fMu").value !== cur) { S.f.mu = "all"; $("fMu").value = "all"; }

    const rb = $("btnRefresh");
    rb.disabled = S.loading;
    rb.className = "btn pri" + (S.loading ? " spin" : "");
    rb.innerHTML = `${ic("refresh")}<span>${S.loading ? "Refreshing..." : "Refresh"}</span>`;
    $("btnToken").innerHTML = ic("key");
    const sd = SORTS[S.f.sort] || SORTS.level;
    $("fSort").value = S.f.sort;
    $("fDir").innerHTML = `<span style="display:inline-flex;transform:rotate(${S.f.dir === "desc" ? 90 : -90}deg)">${ic("caret")}</span><span>${S.f.dir === "desc" ? sd[1] : sd[2]}</span>`;
    paintUpd();
  }

  function paintUpd() {
    const el = $("upd");
    if (S.loading) { el.textContent = "Updating..."; return; }
    if (!S.lastOk) {
      if (S.cachedAt) { const m = Math.round((Date.now() - S.cachedAt) / 60000); el.textContent = `Showing saved data from ${m < 60 ? m + "m" : Math.floor(m / 60) + "h"} ago`; }
      else el.textContent = getToken() ? "" : "Token required";
      return;
    }
    const ago = Math.round((Date.now() - S.lastOk) / 1000);
    const next = S.lastStart + CFG.refreshMs - Date.now();
    el.textContent = `Updated ${ago < 60 ? ago + "s" : Math.floor(ago / 60) + "m"} ago · next refresh in ${clock(next)}`;
  }

  function rolesHtml(id) {
    const r = roleOf(id), out = [];
    if (r.leader) out.push(`<span class="role leader">${ic("crown")}Leader</span>`);
    if (r.treasurer) out.push(`<span class="role treasurer">${ic("coins")}Treasurer</span>`);
    if (r.council && !r.leader) out.push(`<span class="role council">${ic("gavel")}Council</span>`);
    if (!out.length) out.push(`<span class="role">Member</span>`);
    return out.join("");
  }

  function typeHtml(cls) {
    const t = TYPE[cls.type];
    const icons = t.icons.map((i) => ic(i)).join("");
    const pct = cls.type === "none" ? "" : ` title="Combat ${Math.round(cls.share * 100)}% / Economic ${Math.round((1 - cls.share) * 100)}% of spent skill points"`;
    return `<div class="ty ${cls.type}"${pct}>${icons}<span>${t.label}</span></div>`;
  }

  function rowHtml(p) {
    const open = S.open.has(p.id);
    if (!p.user) {
      return `<article class="pl" data-id="${esc(p.id)}"><div class="pl-h" style="grid-template-columns:1fr"><span class="err">Could not load player ${esc(String(p.id).slice(-6))}: ${esc(p.error || "")}</span></div></article>`;
    }
    const u = p.user, cls = classify(u), mu = muName(p);
    const mins = minsSince(u.dates && u.dates.lastConnectionAt);
    const dot = mins <= CFG.onlineMins ? "on" : mins <= 1440 ? "rec" : "";
    return `<article class="pl${open ? " open" : ""}" data-id="${esc(p.id)}">
<div class="pl-h" role="button" tabindex="0" aria-expanded="${open}">
  <span class="car">${ic("caret")}</span>
  <div class="av">${u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="lv">${esc((u.leveling && u.leveling.level) != null ? u.leveling.level : "-")}</span></div>
  <div class="who"><div class="nm"><span class="name">${esc(u.username || "-")}</span>${rolesHtml(p.id)}</div></div>
  <div class="mu${mu ? "" : " none"}">${mu ? ic("group", "#A889D7") + `<span title="${esc(mu)}">${esc(mu)}</span>` : "<span>No MU</span>"}</div>
  ${typeHtml(cls)}
  <div class="seen" title="${esc(fmtDate(u.dates && u.dates.lastConnectionAt))}"><i class="dot ${dot}"></i>${esc(relShort(u.dates && u.dates.lastConnectionAt))}</div>
  <div class="wl" title="${esc(fmtNum(wealthOf(u)))}">${ic("coins")}${esc(fmtShort(wealthOf(u)))}</div>
</div>${open ? `<div class="pl-b">${detailHtml(p, cls)}</div>` : ""}</article>`;
  }

  function skillBlock(s, sk) {
    const d = sk[s.k] || {};
    const lvl = Math.max(0, Number(d.level) || 0);
    const val = d.total != null ? d.total : d.value;
    const tip = [["Base", d.value], ["Weapon", d.weapon], ["Equipment", d.equipment], ["Total", d.total]].filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(" | ");
    const cells = Array.from({ length: MAX_CELLS }, (_, i) => `<span class="cell${i < lvl ? " on" : ""}" style="--bg1:${s.c[0]};--bg2:${s.c[1]};--ic:${s.ic}">${ic(s.i)}</span>`).join("");
    return `<div class="sk" style="--ic:${s.ic}" title="${esc(tip)}">
<div class="sk-t">${ic(s.i)}<b>${esc(fmtNum(val == null ? 0 : val))}${s.pct ? "%" : ""}</b><span>${esc(s.l)}</span><span class="sk-lv">Lv ${lvl}</span></div>
<div class="sk-d">${s.d}</div><div class="cells">${cells}</div></div>`;
  }

  function wealthHtml(u) {
    const w = (u.stats && u.stats.wealth) || {};
    return `<div class="wt-g">`
      + tile("o", "Total", "coins", fmtShort(w.total))
      + tile("o", "Money", "coins", fmtShort(w.money))
      + tile("o", "Companies", "factory", fmtShort(w.companies))
      + tile("o", "Items", "boxOpen", fmtShort(w.items))
      + tile("o", "Equipment", "shirt", fmtShort(w.equipments))
      + tile("o", "Weapons", "pistol", fmtShort(w.weapons))
      + `</div>`;
  }

  const prettyCode = (c) => { c = String(c || "").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/[_-]+/g, " ").trim(); return c ? c.charAt(0).toUpperCase() + c.slice(1) : "Unknown"; };
  const itemImg = (code) => `https://media.warera.io/images/itemsv2/${encodeURIComponent(String(code).replace(/\d+$/, ""))}.png?v=2`;

  function companiesHtml(p) {
    const co = p.co;
    if (!co || co.state === "idle") return `<button class="btn" type="button" data-co="${esc(p.id)}">${ic("factory")}Load companies</button>`;
    if (co.state === "loading" && !co.items.length) return `<div class="load">Loading companies...</div>`;
    if (co.state === "error") return `<div class="bn">${ic("warn")}<div>${esc(co.error || "Failed")} <button class="btn" type="button" data-co="${esc(p.id)}">Retry</button></div></div>`;
    if (!co.items.length) return `<div class="load">No companies</div>`;
    return co.items.map((it) => {
      const img = it.itemCode ? `<img class="co-img" src="${esc(itemImg(it.itemCode))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : ic("factory");
      const title = it.err ? esc(it.err) : esc(prettyCode(it.itemCode));
      return `<div class="card co v-o">${img}<div class="co-b"><div class="co-t">${title}${it.name ? ` <span class="co-n">${esc(it.name)}</span>` : ""}</div></div>
<span class="bonus${it.total ? "" : " zero"}" title="Production bonus">${it.total == null ? "-" : "+" + esc(fmtNum(it.total)) + "%"}</span></div>`;
    }).join("");
  }

  function detailHtml(p, cls) {
    const u = p.user, sk = u.skills || {};
    const share = Math.round(cls.share * 100);
    const bar = cls.type === "none" ? "" : `<div class="share"><i class="c" style="width:${share}%"></i><i class="e" style="width:${100 - share}%"></i></div>
<div class="sharel"><span>Combat ${share}% (${cls.c} pts)</span><span>Economic ${100 - share}% (${cls.e} pts)</span></div>`;
    const grp = (g, title) => `<div><div class="sk-h">${title}</div>${SKILLS.filter((s) => s.g === g).map((s) => skillBlock(s, sk)).join("")}</div>`;
    const lv = u.leveling || {};
    return sec("Skills", "bolt", `<span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">${esc(lv.spentSkillPoints != null ? lv.spentSkillPoints + " points spent" : "")}${lv.availableSkillPoints ? " · " + esc(lv.availableSkillPoints) + " unspent" : ""}</span>`)
      + bar
      + `<div class="sk-cols" style="margin-top:12px">${grp("combat", "Fight skills")}${grp("eco", "Economic skills")}</div>`
      + sec("Wealth", "coins") + wealthHtml(u)
      + sec("Companies", "factory") + companiesHtml(p);
  }

  function paintList() {
    const rows = visiblePlayers();
    if (!rows.length) {
      $("list").innerHTML = `<div class="empty">${S.loading ? "Loading..." : (S.players.size ? "No players match these filters." : (getToken() ? "Nothing loaded yet." : "Enter your token to load the party."))}</div>`;
      return;
    }
    $("list").innerHTML = rows.map(rowHtml).join("");
  }
  function paintOne(id) {
    const p = S.players.get(id);
    const el = document.querySelector(`.pl[data-id="${CSS.escape(id)}"]`);
    if (!p || !el) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = rowHtml(p);
    el.replaceWith(tmp.firstElementChild);
  }
  function paintAll() { paintStats(); paintBar(); paintList(); }

  // ---------------------------------------------------------------- modal
  function openTokenModal(msg) {
    const ov = $("modal");
    const base = store.get(LS.base, "");
    ov.innerHTML = `<div class="ov" id="ovBg"><div class="box" role="dialog" aria-modal="true" aria-label="Connection settings">
<h2>${ic("key")}In-game token</h2>
<p>${esc(msg || "The tool needs your WarEra JWT token to read data. It is stored only in this browser (localStorage) and sent only to the WarEra API address below.")}</p>
<label class="fld"><span>JWT token</span><input id="mTok" class="in" type="password" autocomplete="off" spellcheck="false" placeholder="eyJ..."></label>
<details${base ? " open" : ""}><summary>Advanced: API address / proxy</summary>
<label class="fld"><span>Custom API base (leave empty for api6 / api5.warera.io)</span><input id="mBase" class="in" type="url" placeholder="https://your-proxy.workers.dev" value="${esc(base)}"></label>
<p style="margin:0">Only needed if the browser blocks direct calls (CORS). See worker.js.</p></details>
<div class="row"><button class="btn" type="button" id="mCancel">Cancel</button><button class="btn" type="button" id="mClear">Forget token</button><button class="btn pri" type="button" id="mSave">Save &amp; load</button></div>
</div></div>`;
    const close = () => { ov.innerHTML = ""; };
    $("mTok").value = getToken();
    setTimeout(() => $("mTok").focus(), 30);
    $("mCancel").onclick = close;
    $("ovBg").addEventListener("mousedown", (e) => { if (e.target.id === "ovBg") close(); });
    $("mClear").onclick = () => { store.del(LS.token); S.players.clear(); S.lastOk = 0; close(); paintAll(); };
    $("mSave").onclick = () => {
      const t = $("mTok").value.trim().replace(/^Bearer\s+/i, "");
      const b = $("mBase").value.trim();
      if (!t) { $("mTok").focus(); return; }
      store.set(LS.token, t);
      if (b) store.set(LS.base, b); else store.del(LS.base);
      close(); refresh(true);
    };
    ov.querySelector(".box").addEventListener("keydown", (e) => { if (e.key === "Enter") $("mSave").click(); if (e.key === "Escape") close(); });
  }

  // ---------------------------------------------------------------- events
  function bind() {
    $("fSearch").addEventListener("input", (e) => { S.f.q = e.target.value; paintList(); });
    $("fMu").addEventListener("change", (e) => { S.f.mu = e.target.value; paintList(); });
    const saveSort = () => store.set("wr_sort", JSON.stringify({ sort: S.f.sort, dir: S.f.dir }));
    $("fSort").addEventListener("change", (e) => { S.f.sort = e.target.value; S.f.dir = (SORTS[S.f.sort] || SORTS.level)[0]; saveSort(); paintBar(); paintList(); });
    $("fDir").addEventListener("click", () => { S.f.dir = S.f.dir === "desc" ? "asc" : "desc"; saveSort(); paintBar(); paintList(); });
    $("fType").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (!b) return; S.f.type = b.dataset.t; paintBar(); paintList(); });
    $("btnRefresh").addEventListener("click", () => refresh(true));
    $("btnToken").addEventListener("click", () => openTokenModal());

    const list = $("list");
    const toggle = (row) => {
      const id = row.dataset.id;
      if (S.open.has(id)) S.open.delete(id); else S.open.add(id);
      paintOne(id);
      const p = S.players.get(id);
      if (S.open.has(id) && p && p.user && !p.co) loadCompanies(id);
    };
    list.addEventListener("click", (e) => {
      const cb = e.target.closest("[data-co]");
      if (cb) { loadCompanies(cb.dataset.co); return; }
      const h = e.target.closest(".pl-h");
      if (h) toggle(h.parentElement);
    });
    list.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("pl-h")) { e.preventDefault(); toggle(e.target.parentElement); }
    });
  }


  // ---------------------------------------------------------------- hidden diagnostics
  // Open with: Ctrl+Shift+D, or add ?diag to the URL, or click the footer text 3 times.
  const shape = (v, depth = 0) => {
    if (v === null) return "null";
    if (Array.isArray(v)) return `array(${v.length})` + (v.length && depth < 1 ? " of " + shape(v[0], depth + 1) : "");
    if (typeof v === "object") { const k = Object.keys(v); return depth < 1 ? `{${k.slice(0, 25).join(", ")}${k.length > 25 ? ", ..." : ""}}` : `object(${k.length} keys)`; }
    return typeof v;
  };
  const cut = (t, n) => { t = String(t == null ? "" : t); return t.length > n ? t.slice(0, n) + `... [+${t.length - n} chars]` : t; };

  async function rawProbe(base, proc, input, token) {
    const t0 = performance.now();
    const out = { base, proc, input: JSON.stringify(input) };
    try {
      const res = await fetch(`${base}/trpc/${proc}?batch=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ "0": input }),
      });
      out.status = res.status;
      out.ms = Math.round(performance.now() - t0);
      out.contentType = res.headers.get("content-type") || "-";
      out.headers = Array.from(res.headers.keys()).join(", ");
      out.text = await res.text();
      try { out.json = JSON.parse(out.text); } catch (e) { out.parseError = String(e.message || e); }
    } catch (e) {
      out.ms = Math.round(performance.now() - t0);
      out.netError = String((e && e.message) || e);
    }
    return out;
  }

  function describe(r) {
    const L = [];
    L.push(`- request : POST ${r.base}/trpc/${r.proc}?batch=1   body {"0":${r.input}}`);
    if (r.netError) { L.push(`- RESULT  : NETWORK ERROR after ${r.ms}ms -> ${r.netError}`); return { text: L.join("\n"), data: null }; }
    L.push(`- HTTP    : ${r.status} (${r.ms}ms), content-type ${r.contentType}`);
    L.push(`- visible response headers: ${r.headers || "-"}`);
    if (r.parseError) { L.push(`- RESULT  : body is not JSON (${r.parseError})`); L.push(`- raw     : ${cut(r.text, 500)}`); return { text: L.join("\n"), data: null }; }
    const first = Array.isArray(r.json) ? r.json[0] : r.json;
    L.push(`- envelope: ${Array.isArray(r.json) ? "array(" + r.json.length + ")" : typeof r.json} -> first = ${shape(first)}`);
    if (first && first.error) {
      const e = first.error;
      L.push(`- RESULT  : API ERROR -> ${(e.json && e.json.message) || e.message || "?"} | code ${(e.json && e.json.data && e.json.data.code) || (e.data && e.data.code) || "?"}`);
      L.push(`- raw     : ${cut(r.text, 500)}`);
      return { text: L.join("\n"), data: null };
    }
    let data = first && first.result ? first.result.data : first;
    const wrapped = data && typeof data === "object" && "json" in data;
    if (wrapped) L.push(`- note    : data is wrapped in {json: ...} (the app unwraps this automatically)`);
    data = unwrap(data);
    L.push(`- data    : ${shape(data)}`);
    L.push(`- raw     : ${cut(r.text, 420)}`);
    return { text: L.join("\n"), data };
  }

  async function runDiagnostics(setOut) {
    const R = [];
    const add = (s) => { R.push(s); setOut(R.join("\n")); };
    const head = (s) => add(`\n=== ${s} ===`);
    const token = getToken();
    add("WarEra Party Roster - diagnostics report");
    add("Generated: " + new Date().toISOString());

    head("1. Environment");
    add("page      : " + location.href);
    add("origin    : " + location.origin + (location.protocol === "file:" ? "   (file:// - browsers usually block API calls from here; use GitHub Pages or a local server)" : ""));
    add("userAgent : " + navigator.userAgent);
    add("online    : " + navigator.onLine);
    add("language  : " + navigator.language);
    let ls = "ok"; try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); } catch (e) { ls = "BLOCKED (" + e.message + ")"; }
    add("localStorage: " + ls);
    add("partyId   : " + CFG.partyId);
    add("api bases : " + bases().join(" , ") + (store.get(LS.base, "") ? "   (custom)" : "   (default)"));
    if (!token) add("token     : MISSING");
    else {
      let exp = "unknown", alg = "?", keys = "?";
      try {
        const [h, p] = token.split(".");
        const dec = (x) => JSON.parse(atob(x.replace(/-/g, "+").replace(/_/g, "/")));
        alg = dec(h).alg; const pl = dec(p); keys = Object.keys(pl).join(", ");
        if (pl.exp) exp = new Date(pl.exp * 1000).toISOString() + (Date.now() > pl.exp * 1000 ? "  <-- EXPIRED" : "  (valid)");
      } catch (e) { exp = "not a decodable JWT"; }
      add(`token     : present, ${token.length} chars, alg ${alg}, payload keys [${keys}], exp ${exp}   (value is never printed)`);
      const dots = (token.match(/\./g) || []).length;
      add(`token shape: ${dots} dot(s) (a normal JWT has 2 and is usually 150+ chars), charset ${/^[A-Za-z0-9._-]+$/.test(token) ? "url-safe" : "CONTAINS UNUSUAL CHARACTERS (quotes/spaces/newline?)"}, ${/^[0-9a-f]+$/i.test(token) ? "looks like a hex string, not a JWT" : "not pure hex"}`);
    }
    if (!token) { add("\nStop: no token saved. Save one with the key button, then re-run."); return R.join("\n"); }

    head("2. Can the browser reach the API? (CORS vs network)");
    for (const base of bases()) {
      let reach;
      try { await fetch(base + "/", { mode: "no-cors" }); reach = "reachable (opaque response)"; } catch (e) { reach = "NOT reachable: " + (e.message || e); }
      add(`${base}  no-cors ping -> ${reach}`);
    }

    // pick first base that answers party.getById
    let party = null, base = null;
    head("3. party.getById");
    for (const b of bases()) {
      const r = await rawProbe(b, "party.getById", { partyId: CFG.partyId }, token);
      const d = describe(r);
      add(`[${b}]\n${d.text}`);
      if (d.data) { party = d.data; base = b; break; }
    }
    if (!party) {
      add("\nVERDICT: party request failed.");
      add("  - 'NETWORK ERROR' while the ping above says reachable  => CORS block: deploy worker.js and set API base.");
      add("  - HTTP 401 / UNAUTHORIZED => token invalid or expired.");
      add("  - HTTP 429 'anonymous limit' => the server does NOT recognise your token (treated as anonymous, 100 req/min). Re-copy a full valid token. Otherwise just wait a minute.");
      return R.join("\n");
    }
    const mem = party.members;
    add("\nparsed:");
    add(`- name        : ${party.name}`);
    add(`- members     : ${Array.isArray(mem) ? mem.length : "MISSING (" + typeof mem + ")"}`);
    add(`- councilMembers: ${Array.isArray(party.councilMembers) ? party.councilMembers.length : "MISSING"}`);
    add(`- leader      : ${party.leader || "MISSING"}`);
    add(`- treasurer   : ${party.treasurer || "MISSING"}`);
    add(`- member id sample type: ${mem && mem.length ? typeof mem[0] + (typeof mem[0] === "object" ? " " + shape(mem[0]) : "") : "-"}`);
    if (!Array.isArray(mem) || !mem.length) { add("\nVERDICT: party has no usable members array - the app cannot list players. Send this report."); return R.join("\n"); }

    const sampleId = typeof mem[0] === "object" ? (mem[0]._id || mem[0].id) : mem[0];
    head("4. user.getUserById (first member: " + sampleId + ")");
    const ru = await rawProbe(base, "user.getUserById", { userId: sampleId }, token);
    const du = describe(ru); add(du.text);
    const u = du.data;
    let muId = null, coUser = sampleId;
    if (u) {
      const sk = u.skills || {};
      const want = ["username", "avatarUrl", "mu", "leveling.level", "leveling.totalXp", "leveling.spentSkillPoints", "dates.lastConnectionAt", "stats.wealth.total", "stats.wealth.money", "stats.wealth.companies", "stats.wealth.items", "stats.wealth.equipments", "stats.wealth.weapons"];
      const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
      add("\nfields the app uses:");
      want.forEach((w) => { const v = get(u, w); add(`- ${w.padEnd(26)}: ${v === undefined ? "MISSING" : v === null ? "null" : cut(typeof v === "object" ? JSON.stringify(v) : v, 60)}`); });
      add("skills (level / total):");
      SKILLS.forEach((s) => { const d = sk[s.k]; add(`- ${s.k.padEnd(17)}: ${d ? `level ${d.level} / total ${d.total} / value ${d.value}` : "MISSING"}`); });
      const cls = classify(u);
      add(`classification: ${cls.type} (combat pts ${cls.c}, economic pts ${cls.e}, combat share ${Math.round(cls.share * 100)}%)`);
      muId = u.mu || null;
    }

    head("5. mu.getById" + (muId ? " (" + muId + ")" : ""));
    if (!muId) add("first member has no MU - skipped (the app shows 'No MU').");
    else { const d = describe(await rawProbe(base, "mu.getById", { muId }, token)); add(d.text); if (d.data) add("parsed name: " + d.data.name); }

    head("6. company.getCompanies + company.getById + company.getProductionBonus");
    const rc = describe(await rawProbe(base, "company.getCompanies", { userId: coUser, perPage: CFG.companiesPerPage }, token));
    add(rc.text);
    const items = rc.data && rc.data.items;
    if (!Array.isArray(items)) add("items: MISSING or not an array");
    else if (!items.length) add("items: empty (first member has no companies)");
    else {
      add(`items: ${items.length}, first item type ${typeof items[0]}${typeof items[0] === "object" ? " " + shape(items[0]) : ""}`);
      const cid = typeof items[0] === "object" ? (items[0]._id || items[0].id) : items[0];
      const ri = describe(await rawProbe(base, "company.getById", { companyId: cid }, token)); add("\n[company.getById]\n" + ri.text);
      if (ri.data) add("parsed itemCode: " + ri.data.itemCode + (ri.data.name ? " | name: " + ri.data.name : ""));
      const rb = describe(await rawProbe(base, "company.getProductionBonus", { companyId: cid }, token)); add("\n[company.getProductionBonus]\n" + rb.text);
    }

    head("7. App state");
    add(`loading=${S.loading}, lastOk=${S.lastOk ? new Date(S.lastOk).toISOString() : "never"}, players in memory=${S.players.size}, roles=${S.roles.size}, MU names cached=${Object.keys(S.mu).length}`);
    const bad = Array.from(S.players.values()).filter((p) => p.error);
    add(`players that failed to load: ${bad.length}`);
    bad.slice(0, 8).forEach((p) => add(`  - ${p.id}: ${p.error}`));
    add(`rate limiter: limit ${RL.limit}/min, requests in last minute ${RL.stamps.filter((t) => Date.now() - t < 60000).length}`);
    add(`filters: ${JSON.stringify(S.f)}`);
    add(`open rows: ${S.open.size}`);

    head("8. Recent API calls made by the app (newest last)");
    if (!LOG.length) add("(none yet)");
    LOG.slice(-25).forEach((l) => add(`${l.at.slice(11, 19)}  ${String(l.status).padStart(3)}  ${String(l.ms).padStart(5)}ms  ${l.proc}${l.err ? "  ERR " + l.err : ""}`));
    const stat = {}; LOG.forEach((l) => { stat[l.status] = (stat[l.status] || 0) + 1; });
    add("status counts: " + JSON.stringify(stat));

    add("\n=== end of report ===");
    return R.join("\n");
  }

  function openDiagnostics() {
    const ov = $("modal");
    ov.innerHTML = `<div class="ov" id="dgBg"><div class="box dg" role="dialog" aria-modal="true" aria-label="Diagnostics">
<h2>${ic("warn")}Diagnostics</h2>
<p>Runs a few test requests and prints what the API returns. Your token is never included. Press Copy and paste the text to whoever is helping you.</p>
<textarea id="dgOut" class="in dg-out" readonly spellcheck="false">Running...</textarea>
<div class="row"><button class="btn" type="button" id="dgRun">${ic("refresh")}Run again</button><button class="btn pri" type="button" id="dgCopy">Copy report</button><button class="btn" type="button" id="dgClose">Close</button></div>
</div></div>`;
    const out = $("dgOut");
    const close = () => { ov.innerHTML = ""; };
    let busy = false;
    const run = async () => {
      if (busy) return; busy = true; $("dgRun").disabled = true; out.value = "Running...";
      try { out.value = await runDiagnostics((t) => { out.value = t; out.scrollTop = out.scrollHeight; }); }
      catch (e) { out.value += "\n\nDIAGNOSTICS CRASHED: " + ((e && e.stack) || e); }
      busy = false; $("dgRun").disabled = false;
    };
    $("dgRun").onclick = run;
    $("dgClose").onclick = close;
    $("dgBg").addEventListener("mousedown", (e) => { if (e.target.id === "dgBg") close(); });
    $("dgCopy").onclick = async () => {
      const b = $("dgCopy");
      try { await navigator.clipboard.writeText(out.value); }
      catch (e) { out.removeAttribute("readonly"); out.select(); document.execCommand("copy"); out.setAttribute("readonly", ""); }
      b.textContent = "Copied!"; setTimeout(() => { b.textContent = "Copy report"; }, 1500);
    };
    run();
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) { e.preventDefault(); openDiagnostics(); }
  });
  (() => { // 3 quick clicks on the footer text
    let n = 0, t = 0;
    const f = document.querySelector(".foot");
    if (f) f.addEventListener("click", () => { const now = Date.now(); n = now - t < 700 ? n + 1 : 1; t = now; if (n >= 3) { n = 0; openDiagnostics(); } });
  })();
  if (PARAMS.has("diag")) setTimeout(openDiagnostics, 300);

  // ---------------------------------------------------------------- start
  bind();
  if (loadCache()) paintHero();
  paintAll();
  if (!getToken()) openTokenModal();
  else refresh();
  setInterval(() => {
    paintUpd();
    if (!S.loading && getToken() && S.lastStart && Date.now() - S.lastStart >= CFG.refreshMs && !$("modal").firstChild) refresh();
  }, 1000);
})();

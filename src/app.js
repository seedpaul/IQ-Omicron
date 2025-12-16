import { buildPlan } from "./plan.js";
import { runAssessment } from "./core/index.js";
import { renderItem } from "./core/render/itemRenderer.js";
import {
  getBaselineNormPack,
  loadSavedNormPack,
  saveNormPack,
  clearSavedNormPack,
  describePack,
  validateNormPack
} from "./core/norms.js";

const els = {
  intro: document.getElementById("screen-intro"),
  test: document.getElementById("screen-test"),
  results: document.getElementById("screen-results"),
  agree: document.getElementById("agree"),
  seedInput: document.getElementById("seedInput"),
  btnStart: document.getElementById("btnStart"),
  btnQuick: document.getElementById("btnQuick"),
  btnReset: document.getElementById("btnReset"),
  normFile: document.getElementById("normFile"),
  btnLoadNorm: document.getElementById("btnLoadNorm"),
  btnClearNorm: document.getElementById("btnClearNorm"),
  normStatus: document.getElementById("normStatus"),
  testPill: document.getElementById("testPill"),
  metaLine: document.getElementById("metaLine"),
  qualityFlags: document.getElementById("qualityFlags"),
  timerValue: document.getElementById("timerValue"),
  qTitle: document.getElementById("qTitle"),
  qPrompt: document.getElementById("qPrompt"),
  stimulus: document.getElementById("stimulus"),
  answerArea: document.getElementById("answerArea"),
  helpText: document.getElementById("helpText"),
  btnBack: document.getElementById("btnBack"),
  btnNext: document.getElementById("btnNext"),
  btnPause: document.getElementById("btnPause"),
  resultsSummary: document.getElementById("resultsSummary"),
  historyArea: document.getElementById("historyArea"),
  btnDownloadJson: document.getElementById("btnDownloadJson"),
  btnDownloadCsv: document.getElementById("btnDownloadCsv"),
  btnDownloadLongCsv: document.getElementById("btnDownloadLongCsv"),
  btnDownloadJsonl: document.getElementById("btnDownloadJsonl"),
  researchMode: document.getElementById("researchMode"),
  btnRestart: document.getElementById("btnRestart")
};

const STORAGE_KEY = "iq_metronics_history_v1";
const CUSTOM_NORM_KEY = "iq_metronics_norm_pack_v1";
const RESEARCH_KEY = "iq_metronics_research_mode";

const state = {
  runSeed: null,
  running: false,
  currentResolver: null,
  currentItem: null,
  timerHandle: null,
  nodeEndsAt: null,
  history: loadHistory(),
  normPack: null,
  researchMode: false,
  lastExports: null
};

function loadHistory(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}

function loadNormPack(){
  const saved = loadSavedNormPack(CUSTOM_NORM_KEY);
  state.normPack = saved || getBaselineNormPack();
  updateNormStatus(saved ? "Custom norm pack loaded." : "Using baseline norms.");
}

function updateNormStatus(extra = ""){
  if (!els.normStatus) return;
  const meta = describePack(state.normPack || getBaselineNormPack());
  const fairness = meta.fairness ? ` | DIF flags: ${meta.fairness.flagged}` : "";
  const note = extra ? ` – ${extra}` : "";
  els.normStatus.textContent = `${meta.name} (v${meta.version})${fairness}${note}`;
}

function loadResearchMode(){
  try{
    const raw = localStorage.getItem(RESEARCH_KEY);
    state.researchMode = raw === "1";
  }catch{
    state.researchMode = false;
  }
  if (els.researchMode){
    els.researchMode.checked = state.researchMode;
  }
  applyResearchVisibility();
}

function setResearchMode(on){
  state.researchMode = !!on;
  try{ localStorage.setItem(RESEARCH_KEY, on ? "1" : "0"); }catch{}
  applyResearchVisibility();
}

function applyResearchVisibility(){
  const show = !!state.researchMode;
  document.querySelectorAll(".research-only").forEach(el => {
    el.classList.toggle("hidden", !show);
  });
  if (els.researchMode){
    els.researchMode.checked = show;
  }
}

function saveHistory(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.slice(0, 10))); }catch{}
}

function formatTime(sec){
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

function showScreen(which){
  els.intro.classList.toggle("hidden", which !== "intro");
  els.test.classList.toggle("hidden", which !== "test");
  els.results.classList.toggle("hidden", which !== "results");
}

function deriveSeed(input){
  if (typeof input === "number" && Number.isFinite(input)) return input >>> 0;
  if (typeof input === "string"){
    const t = input.trim();
    if (t){
      let h = 2166136261 >>> 0;
      for (let i = 0; i < t.length; i++){
        h ^= t.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
  }
  const arr = new Uint32Array(1);
  crypto?.getRandomValues?.(arr);
  return arr[0] >>> 0;
}

function resetTimer(){
  if (state.timerHandle){
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
  els.timerValue.textContent = "--:--";
}

function startTimer(seconds){
  resetTimer();
  if (!seconds) return;
  const end = Date.now() + seconds * 1000;
  state.nodeEndsAt = end;
  els.timerValue.textContent = formatTime(seconds);
  state.timerHandle = setInterval(() => {
    const left = Math.max(0, (state.nodeEndsAt - Date.now()) / 1000);
    els.timerValue.textContent = formatTime(left);
    if (left <= 0){
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }, 250);
}

function renderHistory(){
  if (!els.historyArea) return;
  if (!state.history.length){
    els.historyArea.innerHTML = "<div class=\"muted\">No prior runs in this browser.</div>";
    return;
  }
  els.historyArea.innerHTML = state.history.map(h => `
    <div class="historyRow">
      <div><strong>${h.mode}</strong> · ${new Date(h.at).toLocaleString()}</div>
      <div class="muted small">FSIQ ${h.fsiq} (95% CI ${h.ci.lo}–${h.ci.hi}) · Percentile ${h.pct}</div>
    </div>
  `).join("");
}

function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function renderPrompt(item){
  els.qTitle.textContent = item.title || item.domain || "Item";
  if (item.type === "digitspan"){
    const dir = item.direction === "backward" ? "Backward" : "Forward";
    els.qPrompt.textContent = `${dir} digit span. Remember the digits, then type them.`;
  }else{
    els.qPrompt.textContent = item.prompt || "Respond to continue.";
  }
}

function renderStimulus(item){
  els.stimulus.innerHTML = "";
  if (item.stemSvg){
    const tpl = document.createElement("div");
    tpl.innerHTML = item.stemSvg;
    const svg = tpl.firstElementChild;
    if (svg) els.stimulus.appendChild(svg);
    return;
  }
  if (item.type === "digitspan"){
    const box = document.createElement("div");
    box.className = "callout";
    box.style.fontSize = "26px";
    box.style.letterSpacing = "4px";
    box.textContent = item.digits || "";
    els.stimulus.appendChild(box);
    return;
  }
  els.stimulus.textContent = "";
}

function renderOptions(item, onSelect){
  els.answerArea.innerHTML = "";
  const opts = document.createElement("div");
  opts.className = "options";
  const choices = item.choices || item.options || [];

  choices.forEach((opt, idx) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.dataset.index = String(idx);
    btn.tabIndex = 0;
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", `Option ${idx + 1}`);
    if (typeof opt === "object" && opt.svg){
      btn.innerHTML = opt.svg;
    }else{
      btn.textContent = String(opt);
    }
    const select = () => {
      [...opts.children].forEach(c => c.classList.remove("selected"));
      btn.classList.add("selected");
      onSelect(idx);
    };
    btn.addEventListener("click", select);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault();
        select();
      }
    });
    opts.appendChild(btn);
  });
  els.answerArea.appendChild(opts);
}

function renderInputField(placeholder, onInput){
  els.answerArea.innerHTML = "";
  const input = document.createElement("input");
  input.className = "textInput";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.addEventListener("input", () => onInput(input.value));
  els.answerArea.appendChild(input);
  input.focus();
}

function scoreItem(item, response){
  if (response == null) return { x: null, meta: {} };
  if (item.type === "speed_symbol"){
    const ans = (item.answer || "").toUpperCase();
    const x = String(response.choice || "").toUpperCase() === ans ? 1 : 0;
    return { x, meta: { choice: response.choice } };
  }
  if (item.type === "speed_coding"){
    const user = (response.value || "").trim();
    const x = user && item.answer ? (user === item.answer ? 1 : 0) : null;
    return { x, meta: { value: user } };
  }
  if (item.type === "digitspan"){
    const user = (response.value || "").trim();
    const expected = item.direction === "backward"
      ? [...item.digits].reverse().join("")
      : item.digits;
    const x = user ? (user === expected ? 1 : 0) : null;
    return { x, meta: { value: user, expected } };
  }
  // MC / SVG
  const correctKey = item.answer ?? item.key ?? null;
  const x = (response.choice != null && correctKey != null)
    ? (String(response.choiceVal ?? response.choice) === String(correctKey) ? 1 : 0)
    : null;
  return { x, meta: { choice: response.choiceVal ?? response.choice } };
}

function presentItemUI(ctx){
  const { node, item, raw } = ctx;
  return new Promise((resolve) => {
    state.currentResolver = resolve;
    state.currentItem = item;

    els.testPill.textContent = node.title || node.id || "Test";
    els.metaLine.textContent = node.subtitle || node.mode || "";
    renderPrompt(raw || item);
    renderStimulus(raw || item);
    els.helpText.textContent = "Respond to continue.";
    els.btnNext.disabled = true;
    els.btnBack.disabled = true;
    els.btnPause.disabled = true;

    const t0 = performance.now();
    let renderer = null;
    let fallbackResponse = null;

    const stemType = item?.stem?.type || "";
    const isBlockStem = ["n_back_block","symbol_search_block","coding_block"].includes(stemType);
    const hasRendererOptions = Array.isArray(item?.options) && item.options.length > 0;
    const useRenderer = stemType && (isBlockStem || hasRendererOptions);

    if (useRenderer){
      els.answerArea.innerHTML = "";
      renderer = renderItem({
        mount: els.answerArea,
        item,
        onSelectionChanged: (ready) => { els.btnNext.disabled = !ready; }
      });
    }else{
      const enableNext = () => { els.btnNext.disabled = false; };
      if (raw?.type === "speed_symbol"){
        els.answerArea.innerHTML = "";
        const yes = document.createElement("button");
        const no = document.createElement("button");
        yes.className = "btn";
        no.className = "btn";
        yes.textContent = "Yes";
        no.textContent = "No";
        yes.addEventListener("click", () => { fallbackResponse = { choice: "YES" }; enableNext(); });
        no.addEventListener("click", () => { fallbackResponse = { choice: "NO" }; enableNext(); });
        els.answerArea.appendChild(yes);
        els.answerArea.appendChild(no);
      }else if (raw?.type === "speed_coding" || raw?.type === "digitspan"){
        const placeholder = raw.type === "speed_coding" ? "Enter the digits" : "Type the digits";
        renderInputField(placeholder, (val) => {
          fallbackResponse = { value: val };
          els.btnNext.disabled = !(val && val.trim().length);
          if (val && val.trim().length) enableNext();
        });
      }else{
        renderOptions(raw || item, (idx) => {
          const opt = ((raw?.choices || raw?.options || item.choices || item.options || []))[idx];
          fallbackResponse = { choice: idx, choiceVal: opt?.key ?? opt };
          enableNext();
        });
      }
    }

    els.btnNext.onclick = () => {
      const rtMs = Math.max(0, performance.now() - t0);
      if (renderer){
        const r = renderer.getResponse();
        renderer.cleanup?.();
        resolve({ x: r?.x ?? null, rtMs: r?.rtMs ?? rtMs, meta: r?.meta ?? {} });
        return;
      }
      const scored = scoreItem(raw || item, fallbackResponse);
      resolve({ x: scored.x, rtMs, meta: scored.meta });
    };
  });
}

async function startRun(mode){
  if (state.running) return;
  state.running = true;
  els.btnStart.disabled = true;
  els.btnQuick.disabled = true;

  state.runSeed = deriveSeed(els.seedInput.value || "");
  const plan = buildPlan(mode, { seed: state.runSeed });

  showScreen("test");
  startTimer(plan.nodes[0]?.timeSeconds || null);

  try{
    const result = await runAssessment(
      { plan, banks: plan.banks, ageYears: null, normPack: state.normPack, researchMode: state.researchMode },
      { 
        presentItem: presentItemUI,
        onEvent: (type, payload) => {
          if (type === "NODE_START" && payload?.nodeId){
            const node = plan.nodes.find(n => n.id === payload.nodeId);
            if (node?.timeSeconds) startTimer(node.timeSeconds);
          }
        }
      }
    );
    state.lastExports = result.exports;
    renderResults(result.report);
    pushHistory(mode, result.report);
    showScreen("results");
  }catch(err){
    console.error(err);
    alert("Error during assessment: " + err.message);
    showScreen("intro");
  }finally{
    state.running = false;
    els.btnStart.disabled = !els.agree.checked;
    els.btnQuick.disabled = false;
    resetTimer();
  }
}

function renderResults(report){
  if (!report?.results){
    els.resultsSummary.innerHTML = "<div class=\"muted\">No report generated.</div>";
    return;
  }
  const r = report.results;
  const rows = Object.entries(r.domainIndices || {}).map(([d, idx]) => {
    const pct = r.domainPercentiles?.[d];
    const ci = r.domainCI95?.[d];
    return `
      <div class="resultRow">
        <div class="k">${d}</div>
        <div class="v">Index ${idx?.toFixed?.(1) ?? "--"} · ${pct?.toFixed?.(1) ?? "--"}%</div>
        <div class="muted small">CI ${ci?.lo?.toFixed?.(1) ?? "--"}–${ci?.hi?.toFixed?.(1) ?? "--"}</div>
      </div>
    `;
  }).join("");

  els.resultsSummary.innerHTML = `
    <div class="resultRow">
      <div class="k">FSIQ</div>
      <div class="v"><strong>${r.fsiq?.toFixed?.(1) ?? "--"}</strong> · ${r.fsiqPercentile?.toFixed?.(1) ?? "--"}%</div>
      <div class="muted small">95% CI ${r.fsiqCI95?.lo?.toFixed?.(1) ?? "--"}–${r.fsiqCI95?.hi?.toFixed?.(1) ?? "--"}</div>
    </div>
    <div class="divider"></div>
    ${rows}
  `;
}

function pushHistory(mode, report){
  const r = report?.results;
  if (!r) return;
  state.history.unshift({
    mode,
    at: new Date().toISOString(),
    fsiq: r.fsiq,
    pct: r.fsiqPercentile,
    ci: r.fsiqCI95
  });
  saveHistory();
  renderHistory();
}

function resetHistory(){
  state.history = [];
  saveHistory();
  renderHistory();
}

async function loadNormFromFile(){
  const file = els.normFile?.files?.[0];
  if (!file){
    updateNormStatus("Select a JSON file first.");
    return;
  }
  try{
    const text = await file.text();
    const obj = JSON.parse(text);
    const v = validateNormPack(obj);
    if (!v.valid){
      updateNormStatus(`Invalid norm pack: ${v.errors.join("; ")}`);
      return;
    }
    const { norm, warnings } = saveNormPack(obj, CUSTOM_NORM_KEY);
    state.normPack = norm;
    const note = warnings?.length ? warnings.join("; ") : "Custom norm pack loaded.";
    updateNormStatus(note);
  }catch(err){
    updateNormStatus(`Failed to load norm pack: ${err.message}`);
  }
}

function clearNorm(){
  clearSavedNormPack(CUSTOM_NORM_KEY);
  state.normPack = getBaselineNormPack();
  updateNormStatus("Reverted to baseline norms.");
}

function wireEvents(){
  els.agree?.addEventListener("change", () => {
    els.btnStart.disabled = !els.agree.checked;
  });
  els.btnStart?.addEventListener("click", () => startRun("full"));
  els.btnQuick?.addEventListener("click", () => startRun("quick"));
  els.btnReset?.addEventListener("click", resetHistory);
  els.btnRestart?.addEventListener("click", () => showScreen("intro"));
  els.researchMode?.addEventListener("change", (e) => setResearchMode(e.target.checked));

  els.btnDownloadJson?.addEventListener("click", () => {
    if (!state.lastExports?.runJson) return;
    downloadText("iq-run.json", state.lastExports.runJson, "application/json");
  });
  els.btnDownloadCsv?.addEventListener("click", () => {
    if (!state.lastExports?.itemLogCsv) return;
    downloadText("iq-item-log.csv", state.lastExports.itemLogCsv, "text/csv");
  });
  els.btnDownloadLongCsv?.addEventListener("click", () => {
    if (!state.lastExports?.longCsv) return;
    downloadText("iq-long.csv", state.lastExports.longCsv, "text/csv");
  });
  els.btnDownloadJsonl?.addEventListener("click", () => {
    if (!state.lastExports?.eventsJsonl) return;
    downloadText("iq-events.jsonl", state.lastExports.eventsJsonl, "application/json");
  });

  // Norm pack UI placeholders (pipeline integration will load packs later)
  els.btnLoadNorm?.addEventListener("click", loadNormFromFile);
  els.btnClearNorm?.addEventListener("click", clearNorm);
}

function init(){
  renderHistory();
  els.btnStart.disabled = !els.agree.checked;
  if (els.btnBack) els.btnBack.style.display = "none";
  if (els.btnPause) els.btnPause.style.display = "none";
  wireEvents();
  loadNormPack();
  loadResearchMode();
}

init();

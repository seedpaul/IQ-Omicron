const STORAGE_KEY = "iq_indexia_norm_pack_v1";

const BASELINE_PACK = {
  name: "Baseline (generic, self-contained)",
  version: "0.5",
  createdAt: "2025-12-15",
  notes: "Non-clinical baseline mapping; upload a custom norm pack to calibrate to your sample.",
  thetaToIQ: { mean: 100, sd: 15, thetaMean: 0, thetaSd: 1 },
  ageBands: [{ id: "overall", label: "Overall", thetaMean: 0, thetaSd: 1, n: 0 }],
  fairness: { note: "Baseline only; no DIF analysis.", flaggedItems: [], difMh: [], difLogistic: [] }
};

export function getBaselineNormPack(){
  return JSON.parse(JSON.stringify(BASELINE_PACK));
}

export function validateNormPack(pack){
  const errors = [];
  const warnings = [];

  if (!pack || typeof pack !== "object"){
    errors.push("Norm pack must be a JSON object.");
    return { valid: false, errors, warnings };
  }

  if (!pack.thetaToIQ || typeof pack.thetaToIQ !== "object"){
    errors.push("Missing thetaToIQ section.");
  }else{
    const t = pack.thetaToIQ;
    if (!isFinite(t.thetaMean) || !isFinite(t.thetaSd) || t.thetaSd <= 0){
      errors.push("thetaToIQ.thetaMean/thetaSd must be finite (thetaSd>0).");
    }
    if (!isFinite(t.mean) || !isFinite(t.sd) || t.sd <= 0){
      warnings.push("thetaToIQ mean/sd missing; default 100/15 will be assumed.");
    }
  }

  if (pack.ageBands != null && !Array.isArray(pack.ageBands)){
    warnings.push("ageBands should be an array; ignoring.");
  }

  if (pack.fairness != null && typeof pack.fairness !== "object"){
    warnings.push("fairness should be an object; ignoring.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function normalizedPack(pack){
  const t = pack.thetaToIQ || {};
  const thetaMean = isFinite(t.thetaMean) ? Number(t.thetaMean) : 0;
  const thetaSd = (isFinite(t.thetaSd) && t.thetaSd > 0) ? Number(t.thetaSd) : 1;
  const mean = isFinite(t.mean) ? Number(t.mean) : 100;
  const sd = (isFinite(t.sd) && t.sd > 0) ? Number(t.sd) : 15;
  return {
    ...pack,
    thetaToIQ: { mean, sd, thetaMean, thetaSd },
    ageBands: Array.isArray(pack.ageBands) ? pack.ageBands : [],
    fairness: pack.fairness || {}
  };
}

export function saveNormPack(pack, storageKey = STORAGE_KEY){
  const norm = normalizedPack(pack);
  const v = validateNormPack(norm);
  if (!v.valid) throw new Error(v.errors.join("; "));
  try{
    localStorage.setItem(storageKey, JSON.stringify(norm));
  }catch{}
  return { norm, warnings: v.warnings };
}

export function loadSavedNormPack(storageKey = STORAGE_KEY){
  try{
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const v = validateNormPack(obj);
    if (!v.valid) return null;
    return normalizedPack(obj);
  }catch{
    return null;
  }
}

export function clearSavedNormPack(storageKey = STORAGE_KEY){
  try{ localStorage.removeItem(storageKey); }catch{}
}

export function describePack(pack){
  const fairness = pack?.fairness || {};
  const flagged = Array.isArray(fairness.flaggedItems) ? fairness.flaggedItems.length : 0;
  const difMh = Array.isArray(fairness.difMh) ? fairness.difMh.length : 0;
  const difLog = Array.isArray(fairness.difLogistic) ? fairness.difLogistic.length : 0;
  return {
    name: pack?.name || "Unknown",
    version: pack?.version || "?",
    createdAt: pack?.createdAt || null,
    fairness: { flagged, difMh, difLog, note: fairness.note || null }
  };
}

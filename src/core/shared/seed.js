export function parseSeed(seed, fallback=0){
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const parsed = Number.parseInt(seed, 10);
  if (Number.isFinite(parsed)) return parsed >>> 0;
  return fallback >>> 0;
}

// FNV-1a string hash with crypto fallback for empty input.
export function deriveSeed(input){
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

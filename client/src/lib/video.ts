// Fundus video → the sharpest frames with the retina in view. Everything runs in the browser: the video is never
// uploaded, only the chosen frames are sent to the AI one by one, and their answers are combined.

export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export type VideoFrame = {
  file: File;        // full-resolution JPEG sent to the AI
  preview: string;   // small JPEG data URL for the screen, history and PDF
  time: number;      // seconds into the video
  score: number;     // sharpness × retina coverage (higher is better)
};

export type VideoExtraction = { frames: VideoFrame[]; duration: number; width: number; height: number; sampled: number };

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/i.test(file.name);
}

function waitFor(video: HTMLVideoElement, event: string, ms = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("timeout")); }, ms);
    const ok = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("decode")); };
    const cleanup = () => { window.clearTimeout(timer); video.removeEventListener(event, ok); video.removeEventListener("error", fail); };
    video.addEventListener(event, ok, { once: true });
    video.addEventListener("error", fail, { once: true });
  });
}

async function seek(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001) return;
  const done = waitFor(video, "seeked");
  video.currentTime = time;
  await done;
}

/** Retina coverage, brightness and sharpness (variance of the Laplacian of the green channel inside the retina).
 *  "Retina" = red-orange fundus pixels only. The dark-blue pupil with the lens glare, the grey adapter around the lens
 *  and dust or scratches on the lens are NOT retina: counting every non-black pixel let those frames win on "sharpness". */
function frameScore(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const g = new Float32Array(w * h);
  const mask = new Uint8Array(w * h);
  let inside = 0;
  let lum = 0;
  for (let i = 0, p = 0; p < w * h; i += 4, p++) {
    const r = data[i], gr = data[i + 1], bl = data[i + 2];
    const l = 0.299 * r + 0.587 * gr + 0.114 * bl;
    g[p] = gr;
    // fundus: red clearly dominates blue and a little over green; very bright pixels are glare, not retina
    if (r > 70 && r > 1.3 * bl && r > 1.05 * gr && l < 240) { mask[p] = 1; inside++; lum += l; }
  }
  const coverage = inside / (w * h);
  const brightness = inside ? lum / inside : 0;
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const p = y * w + x;
      // only well inside the retina, so the bright rim of the fundus circle does not count as "sharp"
      if (!mask[p] || !mask[p - 2] || !mask[p + 2] || !mask[p - 2 * w] || !mask[p + 2 * w]) continue;
      const lap = 4 * g[p] - g[p - 1] - g[p + 1] - g[p - w] - g[p + w];
      sum += lap; sum2 += lap * lap; n++;
    }
  }
  const sharpness = n ? sum2 / n - (sum / n) ** 2 : 0;
  // through the phone adapter the fundus is a circle in the middle of the frame, ~10–30% of it
  const usable = coverage > 0.06 && brightness > 35 && brightness < 235;
  return { score: usable ? sharpness * Math.min(1, coverage / 0.2) : 0, coverage, brightness, sharpness };
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality));
}

export async function extractBestFrames(
  file: File,
  { samples = 150, keep = 5, maxSide = 1280, onProgress }: { samples?: number; keep?: number; maxSide?: number; onProgress?: (share: number) => void } = {},
): Promise<VideoExtraction> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  try {
    const meta = waitFor(video, "loadeddata", 20000);
    video.src = url;
    await meta;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const width = video.videoWidth, height = video.videoHeight;
    if (!duration || !width || !height) throw new Error("decode");

    // 1) score evenly spaced frames on a small canvas
    const small = document.createElement("canvas");
    const s = 256 / Math.max(width, height);
    small.width = Math.max(1, Math.round(width * s));
    small.height = Math.max(1, Math.round(height * s));
    const sctx = small.getContext("2d", { willReadFrequently: true });
    if (!sctx) throw new Error("canvas");
    const count = Math.max(keep, Math.min(samples, Math.ceil(duration * 8)));
    const scored: Array<{ time: number; score: number }> = [];
    for (let i = 0; i < count; i++) {
      const time = duration * (0.03 + 0.94 * (count === 1 ? 0.5 : i / (count - 1)));
      await seek(video, time);
      sctx.drawImage(video, 0, 0, small.width, small.height);
      scored.push({ time, score: frameScore(sctx, small.width, small.height).score });
      onProgress?.((i + 1) / (count + keep));
    }

    // 2) the best frames: only clearly sharp ones (≥ 50% of the sharpest), a little apart in time so they are not
    //    near-duplicates of one moment. The retina is often in view for only 2–3 s of a video, so the gap is small
    //    (0.6 s, then 0.3 s, then none) rather than spreading the picks over the whole clip.
    const top = Math.max(0, ...scored.map((c) => c.score));
    const candidates = scored.filter((c) => c.score > 0 && c.score >= 0.5 * top).sort((a, b) => b.score - a.score);
    const chosen: Array<{ time: number; score: number }> = [];
    for (const gap of [0.6, 0.3, 0]) {
      for (const c of candidates) {
        if (chosen.length === keep) break;
        if (!chosen.includes(c) && chosen.every((x) => Math.abs(x.time - c.time) >= gap - 1e-6)) chosen.push(c);
      }
      if (chosen.length === keep) break;
    }
    chosen.sort((a, b) => b.score - a.score);
    if (!chosen.length) throw new Error("noRetina");

    // 3) grab them at full resolution
    const big = document.createElement("canvas");
    const b = Math.min(1, maxSide / Math.max(width, height));
    big.width = Math.round(width * b);
    big.height = Math.round(height * b);
    const bctx = big.getContext("2d");
    const prev = document.createElement("canvas");
    const pv = Math.min(1, 520 / Math.max(width, height));
    prev.width = Math.round(width * pv);
    prev.height = Math.round(height * pv);
    const pctx = prev.getContext("2d");
    if (!bctx || !pctx) throw new Error("canvas");
    const frames: VideoFrame[] = [];
    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      await seek(video, c.time);
      bctx.drawImage(video, 0, 0, big.width, big.height);
      pctx.drawImage(video, 0, 0, prev.width, prev.height);
      const blob = await toBlob(big, 0.93);
      const base = file.name.replace(/\.[^.]+$/, "") || "video";
      frames.push({
        file: new File([blob], `${base}_${c.time.toFixed(1)}s.jpg`, { type: "image/jpeg" }),
        preview: prev.toDataURL("image/jpeg", 0.82),
        time: c.time,
        score: c.score,
      });
      onProgress?.((count + i + 1) / (count + keep));
    }
    return { frames, duration, width, height, sampled: count };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export type FrameAnswer = { probabilities: Record<"dr" | "glaucoma" | "cataract", number>; statuses: Record<"dr" | "glaucoma" | "cataract", string> };

/** Index of the frame whose answer is closest to the per-disease median of all frames (robust to one bad frame). */
export function representativeFrame(answers: FrameAnswer[]) {
  const keys = ["dr", "glaucoma", "cataract"] as const;
  const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const med = Object.fromEntries(keys.map((k) => [k, median(answers.map((a) => a.probabilities[k]))])) as Record<(typeof keys)[number], number>;
  let best = 0, bestDist = Infinity;
  answers.forEach((a, i) => {
    const d = keys.reduce((acc, k) => acc + Math.abs(a.probabilities[k] - med[k]), 0);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  const agreement = Object.fromEntries(keys.map((k) => [k, answers.filter((a) => a.statuses[k] === answers[best].statuses[k]).length])) as Record<(typeof keys)[number], number>;
  return { index: best, median: med, agreement };
}

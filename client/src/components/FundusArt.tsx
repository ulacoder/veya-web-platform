import { useId } from "react";

/**
 * Illustrated retina (right eye, OD) as seen through an ophthalmoscope — the app's signature visual.
 * `detail` adds choroidal texture, vessel light reflexes and the nerve-fibre sheen; small thumbnails turn it off.
 */

// Main vessels leave the optic disc (≈ 268,196) and arc around the macula (≈ 146,200).
// [path, width at the disc]. Veins are darker and wider than the arteries running beside them;
// every vessel tapers towards the periphery.
const VEINS: Array<[string, number]> = [
  ["M266 188C258 168 246 152 226 140S186 118 158 116S108 118 82 128S40 150 8 166", 7.4],
  ["M266 204C256 226 242 244 220 256S182 278 150 282S104 280 76 270S34 252 6 244", 7.4],
  ["M272 186C280 160 290 132 296 104S312 56 322 20", 5.6],
  ["M272 206C282 236 294 266 300 296S316 346 330 392", 5.6],
  ["M276 194C306 190 336 182 364 170S392 160 404 156", 3.2],
  ["M276 200C306 206 340 214 368 228S392 238 404 244", 3.2],
  ["M226 140C220 112 214 86 218 52S222 20 220 0", 3.8],
  ["M158 116C148 92 132 70 112 50S86 26 70 8", 3.6],
  ["M82 128C64 116 44 112 18 114", 2.6],
  ["M220 256C214 284 212 312 220 344S226 380 222 400", 3.8],
  ["M150 282C140 306 124 326 104 346S80 370 66 392", 3.6],
  ["M76 270C58 280 40 284 14 282", 2.6],
  ["M296 104C318 92 344 88 372 92", 2.8],
  ["M300 296C324 310 350 316 378 312", 2.8],
  ["M196 250C186 236 176 224 166 214", 1.8],
  ["M118 124C122 144 128 162 134 178", 1.6],
];
const ARTERIES: Array<[string, number]> = [
  ["M264 190C252 172 236 160 214 152S176 134 146 132S96 138 66 150S28 172 6 184", 5.2],
  ["M264 202C252 220 238 234 216 242S178 262 146 264S98 260 70 252S30 236 6 230", 5.2],
  ["M270 186C274 156 280 128 284 98S290 50 288 14", 4],
  ["M270 206C276 238 282 268 286 300S288 350 280 396", 4],
  ["M214 152C204 128 198 100 202 66S208 30 204 4", 2.8],
  ["M146 132C136 112 122 92 100 74S70 50 52 36", 2.6],
  ["M66 150C50 144 32 144 10 150", 1.8],
  ["M216 242C206 268 200 296 204 330S210 370 204 400", 2.8],
  ["M146 264C134 286 118 304 96 320S66 342 48 356", 2.6],
  ["M70 252C52 258 32 260 8 256", 1.8],
  ["M284 98C302 78 324 64 352 56", 2.2],
  ["M286 300C304 322 326 336 354 344", 2.2],
  ["M200 146C190 160 178 172 168 184", 1.4],
  ["M116 278C122 258 128 240 134 224", 1.3],
];
// Fine capillary twigs pointing at the macula (they stop short of the fovea).
const TWIGS = [
  "M182 128C176 146 170 162 160 180",
  "M128 126C134 144 138 160 140 182",
  "M98 140C112 154 124 168 132 186",
  "M182 268C176 252 168 236 158 220",
  "M126 274C132 256 136 240 140 218",
  "M96 260C110 246 122 232 130 214",
  "M222 178C206 184 190 190 164 196",
  "M222 216C206 212 188 208 164 204",
  "M78 186C96 190 112 194 130 198",
  "M80 214C98 210 114 206 130 202",
];

/** Draws a vessel that narrows towards its end: three overlapping strokes over the same path. */
function Vessel({ d, w, color }: { d: string; w: number; color: string }) {
  return (
    <g stroke={color}>
      <path d={d} strokeWidth={w * 0.42} />
      <path d={d} strokeWidth={w * 0.7} pathLength={100} strokeDasharray="62 200" />
      <path d={d} strokeWidth={w} pathLength={100} strokeDasharray="30 200" />
    </g>
  );
}

export function FundusArt({ className, detail = true }: { className?: string; detail?: boolean }) {
  const id = useId().replace(/:/g, "");
  const u = (name: string) => `${name}-${id}`;
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id={u("bg")} cx="56%" cy="50%" r="66%">
          <stop offset="0" stopColor="#ea8d48" />
          <stop offset=".22" stopColor="#e07a3a" />
          <stop offset=".45" stopColor="#cf5e2a" />
          <stop offset=".72" stopColor="#a83c1a" />
          <stop offset="1" stopColor="#5a170a" />
        </radialGradient>
        <radialGradient id={u("vig")} cx="50%" cy="50%" r="50%">
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset=".93" stopColor="#1a0603" stopOpacity=".55" />
          <stop offset="1" stopColor="#0d0302" stopOpacity=".9" />
        </radialGradient>
        <radialGradient id={u("mac")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#5c160a" stopOpacity=".7" />
          <stop offset=".45" stopColor="#7a240f" stopOpacity=".38" />
          <stop offset="1" stopColor="#8c2c12" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u("halo")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd59a" stopOpacity=".6" />
          <stop offset=".55" stopColor="#f8b066" stopOpacity=".28" />
          <stop offset="1" stopColor="#f09a52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u("disc")} cx="44%" cy="48%" r="58%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".4" stopColor="#ffeec6" />
          <stop offset=".8" stopColor="#ffd796" />
          <stop offset="1" stopColor="#f7bf78" />
        </radialGradient>
        <radialGradient id={u("sheen")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd9a8" stopOpacity=".38" />
          <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
        </radialGradient>
        <clipPath id={u("clip")}><circle cx="200" cy="200" r="200" /></clipPath>
        {detail && (
          <>
            <filter id={u("tex")} x="0" y="0" width="100%" height="100%">
              {/* coarse choroidal mottling + fine grain */}
              <feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="7" result="coarse" />
              <feColorMatrix in="coarse" type="matrix" values="0 0 0 0 .32  0 0 0 0 .07  0 0 0 0 .02  0 0 0 1.3 -.55" result="blotch" />
              <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="3" result="fine" />
              <feColorMatrix in="fine" type="matrix" values="0 0 0 0 .4  0 0 0 0 .12  0 0 0 0 .05  0 0 0 .9 -.38" result="grain" />
              <feMerge><feMergeNode in="blotch" /><feMergeNode in="grain" /></feMerge>
            </filter>
            <filter id={u("soft")} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1" /></filter>
            <filter id={u("glow")} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
          </>
        )}
      </defs>

      <g clipPath={`url(#${u("clip")})`}>
        <rect width="400" height="400" fill={`url(#${u("bg")})`} />
        {detail && <rect width="400" height="400" filter={`url(#${u("tex")})`} opacity=".55" />}

        {/* nerve-fibre layer sheen along the arcades */}
        {detail && (
          <g opacity=".9">
            <ellipse cx="200" cy="138" rx="90" ry="22" fill={`url(#${u("sheen")})`} transform="rotate(-8 200 138)" />
            <ellipse cx="200" cy="258" rx="90" ry="22" fill={`url(#${u("sheen")})`} transform="rotate(8 200 258)" />
          </g>
        )}

        {/* macula + fovea */}
        <ellipse cx="146" cy="200" rx="50" ry="44" fill={`url(#${u("mac")})`} />
        {detail && <circle cx="146" cy="200" r="3" fill="#ffe2b0" opacity=".85" />}

        {/* vessels: soft shadow, body, then the central light reflex */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {detail && (
            <g stroke="#3d0d05" opacity=".28" filter={`url(#${u("soft")})`}>
              {VEINS.map(([d, w]) => <path key={`vs${d}`} d={d} strokeWidth={w * 0.8 + 2} />)}
              {ARTERIES.map(([d, w]) => <path key={`as${d}`} d={d} strokeWidth={w * 0.8 + 1.6} />)}
            </g>
          )}
          {detail && <g stroke="#9c3418" strokeWidth=".9" opacity=".55">{TWIGS.map((d) => <path key={d} d={d} />)}</g>}
          {VEINS.map(([d, w]) => <Vessel key={`v${d}`} d={d} w={w} color="#6c170b" />)}
          {ARTERIES.map(([d, w]) => <Vessel key={`a${d}`} d={d} w={w} color="#b4401f" />)}
          {detail && <g stroke="#f8b48c" opacity=".6">{ARTERIES.filter(([, w]) => w >= 2.6).map(([d, w]) => <path key={`r${d}`} d={d} strokeWidth={w * 0.2} pathLength={100} strokeDasharray="70 200" />)}</g>}
          {detail && <g stroke="#a4381c" opacity=".5">{VEINS.filter(([, w]) => w >= 5).map(([d, w]) => <path key={`vr${d}`} d={d} strokeWidth={w * 0.16} pathLength={100} strokeDasharray="55 200" />)}</g>}
        </g>

        {/* optic disc: peripapillary glow, rim, physiological cup */}
        <circle cx="268" cy="196" r="52" fill={`url(#${u("halo")})`} filter={detail ? `url(#${u("glow")})` : undefined} />
        <ellipse cx="268" cy="196" rx="27" ry="30" fill={`url(#${u("disc")})`} opacity=".97" />
        <ellipse cx="264" cy="195" rx="11" ry="13" fill="#fffdf6" opacity=".9" />
        <ellipse cx="268" cy="196" rx="28.5" ry="31.5" fill="none" stroke="#7d2a12" strokeWidth={detail ? 3 : 2} opacity=".42" />
        {detail && <ellipse cx="268" cy="196" rx="27" ry="30" fill="none" stroke="#d27838" strokeWidth="1.6" opacity=".85" />}
        {/* vessel trunks emerging from the cup across the rim */}
        <g fill="none" strokeLinecap="round" opacity=".85">
          <path d="M266 190C265 180 262 172 257 166" stroke="#6c170b" strokeWidth="4.6" />
          <path d="M266 202C265 212 262 220 257 226" stroke="#6c170b" strokeWidth="4.6" />
          <path d="M264 192C260 184 254 178 247 174" stroke="#b4401f" strokeWidth="3.2" />
          <path d="M264 200C260 208 254 214 247 218" stroke="#b4401f" strokeWidth="3.2" />
          <path d="M270 190C273 180 276 174 280 168" stroke="#6c170b" strokeWidth="3.6" />
          <path d="M270 202C273 212 276 218 280 224" stroke="#6c170b" strokeWidth="3.6" />
          <path d="M269 191C271 181 272 175 273 168" stroke="#b4401f" strokeWidth="2.6" />
          <path d="M269 201C271 211 272 217 273 224" stroke="#b4401f" strokeWidth="2.6" />
          <path d="M272 195C280 194 288 193 295 192" stroke="#6c170b" strokeWidth="2.2" />
        </g>

        <rect width="400" height="400" fill={`url(#${u("vig")})`} />
      </g>
    </svg>
  );
}

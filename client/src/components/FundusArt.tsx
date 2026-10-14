import { useId } from "react";

/**
 * Illustrated retina (right eye, OD) — the app's signature visual.
 * Kept deliberately simple and light: warm gradient, the main vessel arcades,
 * a pale optic disc and a soft macula. `detail` only toggles the secondary branches.
 */

// Main vessels leave the optic disc (≈ 268,196) and arc around the macula (≈ 146,200).
const MAIN: Array<[string, number]> = [
  ["M266 188C258 168 246 152 226 140S186 118 158 116S108 118 82 128S40 150 8 166", 5.4],
  ["M266 204C256 226 242 244 220 256S182 278 150 282S104 280 76 270S34 252 6 244", 5.4],
  ["M272 186C280 160 290 132 296 104S312 56 322 20", 4.2],
  ["M272 206C282 236 294 266 300 296S316 346 330 392", 4.2],
  ["M264 192C252 174 236 162 214 154S176 136 146 134S96 140 66 152S28 174 6 186", 3.8],
  ["M264 200C252 218 238 232 216 240S178 260 146 262S98 258 70 250S30 234 6 228", 3.8],
];
const BRANCHES: Array<[string, number]> = [
  ["M226 140C220 112 214 86 218 52S222 20 220 0", 2.8],
  ["M158 116C148 92 132 70 112 50S86 26 70 8", 2.6],
  ["M220 256C214 284 212 312 220 344S226 380 222 400", 2.8],
  ["M150 282C140 306 124 326 104 346S80 370 66 392", 2.6],
  ["M296 104C318 92 344 88 372 92", 2.2],
  ["M300 296C324 310 350 316 378 312", 2.2],
  ["M276 196C306 192 340 184 400 170", 2],
];

export function FundusArt({ className, detail = true }: { className?: string; detail?: boolean }) {
  const id = useId().replace(/:/g, "");
  const u = (name: string) => `${name}-${id}`;
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id={u("bg")} cx="56%" cy="48%" r="62%">
          <stop offset="0" stopColor="#ffc58f" />
          <stop offset=".45" stopColor="#f6a066" />
          <stop offset="1" stopColor="#ec8650" />
        </radialGradient>
        <radialGradient id={u("mac")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#e57a45" stopOpacity=".55" />
          <stop offset="1" stopColor="#e57a45" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u("disc")} cx="44%" cy="48%" r="60%">
          <stop offset="0" stopColor="#fffbf2" />
          <stop offset=".55" stopColor="#ffeac2" />
          <stop offset="1" stopColor="#ffd69c" />
        </radialGradient>
        <clipPath id={u("clip")}><circle cx="200" cy="200" r="200" /></clipPath>
      </defs>
      <g clipPath={`url(#${u("clip")})`}>
        <rect width="400" height="400" fill={`url(#${u("bg")})`} />
        <ellipse cx="146" cy="200" rx="52" ry="46" fill={`url(#${u("mac")})`} />
        <g fill="none" stroke="#d4603a" strokeLinecap="round" opacity=".85">
          {MAIN.map(([d, w]) => <path key={d} d={d} strokeWidth={w} />)}
          {detail && BRANCHES.map(([d, w]) => <path key={d} d={d} strokeWidth={w} />)}
        </g>
        <ellipse cx="268" cy="196" rx="27" ry="30" fill={`url(#${u("disc")})`} />
        <ellipse cx="264" cy="195" rx="11" ry="13" fill="#ffffff" opacity=".7" />
      </g>
    </svg>
  );
}

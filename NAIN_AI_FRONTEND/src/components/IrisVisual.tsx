import React from "react";

/**
 * IrisVisual — A medical-imaging inspired iris/retinal scan SVG.
 *
 * Design intent:
 * - Concentric rings of varying weight to mimic OCT retinal scans
 * - Radial gradient center glow suggesting a light source / pupil
 * - 8 subtle radial tick marks at the outermost ring — like a measurement reticle
 * - Outer ambient glow ring for depth
 * - NOT a literal eye / NOT a radar / NOT a target
 *
 * Animation: applied via CSS class on the wrapper (irisBreath — subtle scale+opacity)
 */
export const IrisVisual: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center w-full h-full select-none pointer-events-none">
      {/* Outer ambient glow — pure CSS, blurred circle behind SVG */}
      <div
        className="absolute rounded-full"
        style={{
          width: "72%",
          height: "72%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.10) 50%, transparent 75%)",
          filter: "blur(28px)",
        }}
        aria-hidden="true"
      />

      {/* Main SVG iris */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-iris-breath relative z-10"
        style={{ width: "min(340px, 72vw)", height: "min(340px, 72vw)" }}
        aria-label="Iris retinal scan visual"
        role="img"
      >
        <defs>
          {/* Center radial gradient — warm lens glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.90" />
            <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#1D4ED8" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </radialGradient>

          {/* Outer ring gradient */}
          <radialGradient id="outerRingGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0" />
            <stop offset="85%" stopColor="#93C5FD" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.28" />
          </radialGradient>
        </defs>

        {/* ── Ring 1 — outermost, lightest, thin ─────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="186"
          stroke="rgba(147,197,253,0.22)"
          strokeWidth="1"
          className="animate-iris-ring"
        />

        {/* ── Ring 2 — measurement reticle ring ──────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="170"
          stroke="rgba(147,197,253,0.38)"
          strokeWidth="1.2"
        />

        {/* 8 radial tick marks at r=170, every 45° */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const innerR = 162;
          const outerR = 178;
          const x1 = 200 + innerR * Math.cos(angle);
          const y1 = 200 + innerR * Math.sin(angle);
          const x2 = 200 + outerR * Math.cos(angle);
          const y2 = 200 + outerR * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(147,197,253,0.50)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Ring 3 — inner structural ring, medium weight ──────── */}
        <circle
          cx="200"
          cy="200"
          r="142"
          stroke="rgba(96,165,250,0.45)"
          strokeWidth="1.8"
        />

        {/* ── Ring 4 — zone demarcation, dashed ──────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="116"
          stroke="rgba(96,165,250,0.35)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
        />

        {/* ── Outer gradient fill — gives the iris depth ─────────── */}
        <circle cx="200" cy="200" r="142" fill="url(#outerRingGrad)" />

        {/* ── Ring 5 — inner annulus, stronger ───────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="88"
          stroke="rgba(147,197,253,0.55)"
          strokeWidth="2"
        />

        {/* ── Ring 6 — central zone boundary ─────────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="60"
          stroke="rgba(191,219,254,0.45)"
          strokeWidth="1.5"
        />

        {/* ── 4 subtle cross hair lines — very thin, medical feel ── */}
        <line x1="200" y1="148" x2="200" y2="120" stroke="rgba(147,197,253,0.25)" strokeWidth="1" strokeLinecap="round" />
        <line x1="200" y1="252" x2="200" y2="280" stroke="rgba(147,197,253,0.25)" strokeWidth="1" strokeLinecap="round" />
        <line x1="148" y1="200" x2="120" y2="200" stroke="rgba(147,197,253,0.25)" strokeWidth="1" strokeLinecap="round" />
        <line x1="252" y1="200" x2="280" y2="200" stroke="rgba(147,197,253,0.25)" strokeWidth="1" strokeLinecap="round" />

        {/* ── Central glow fill — the "lens" ─────────────────────── */}
        <circle cx="200" cy="200" r="58" fill="url(#centerGlow)" />

        {/* ── Innermost ring — sharp center ──────────────────────── */}
        <circle
          cx="200"
          cy="200"
          r="30"
          stroke="rgba(219,234,254,0.70)"
          strokeWidth="2"
        />

        {/* ── Pupil dot ───────────────────────────────────────────── */}
        <circle cx="200" cy="200" r="12" fill="rgba(239,246,255,0.85)" />
        <circle cx="200" cy="200" r="5" fill="rgba(255,255,255,0.95)" />
      </svg>
    </div>
  );
};

import React from "react";

export const RetinalOrbit: React.FC = () => {
  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 my-auto mx-auto flex items-center justify-center pointer-events-none select-none">
      {/* Soft Ambient Radial Glow Behind Circle */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-blue-400/20 to-indigo-500/10 blur-3xl animate-pulse-glow" />

      {/* SVG Iris & Retinal Orbit Graphic */}
      <svg
        className="w-full h-full relative z-10 drop-shadow-[0_0_35px_rgba(37,99,235,0.25)]"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial Iris Gradient */}
          <radialGradient id="irisCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#1769E0" stopOpacity="0.25" />
            <stop offset="85%" stopColor="#0B2A6F" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#0A1B3D" stopOpacity="0" />
          </radialGradient>

          {/* Outer Ring Stroke Gradient */}
          <linearGradient id="orbitStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#1769E0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.1" />
          </linearGradient>

          {/* Retinal Vessel Path Gradient */}
          <linearGradient id="vesselStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer Orbital Layer - Concentric Dashed Ring */}
        <circle
          cx="200"
          cy="200"
          r="185"
          stroke="url(#orbitStroke)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          className="opacity-60"
        />

        {/* Outer Ring Accent */}
        <circle
          cx="200"
          cy="200"
          r="165"
          stroke="#3B82F6"
          strokeWidth="1"
          strokeOpacity="0.25"
        />

        {/* Primary Iris Boundary Ring */}
        <circle
          cx="200"
          cy="200"
          r="140"
          stroke="url(#orbitStroke)"
          strokeWidth="2"
          className="opacity-90"
        />

        {/* Inner Glowing Iris Field */}
        <circle cx="200" cy="200" r="140" fill="url(#irisCore)" />

        {/* Secondary Concentric Ring with Radial Ticks */}
        <circle
          cx="200"
          cy="200"
          r="105"
          stroke="#93C5FD"
          strokeWidth="1.2"
          strokeDasharray="2 12"
          strokeOpacity="0.5"
        />

        {/* Optical Axis Focal Ring */}
        <circle
          cx="200"
          cy="200"
          r="70"
          stroke="url(#orbitStroke)"
          strokeWidth="1.8"
          className="opacity-80"
        />

        {/* Center Fovea / Pupil Core */}
        <circle
          cx="200"
          cy="200"
          r="38"
          fill="#0B2A6F"
          stroke="#60A5FA"
          strokeWidth="2"
          strokeOpacity="0.8"
        />
        <circle cx="200" cy="200" r="16" fill="#60A5FA" fillOpacity="0.9" />
        <circle cx="194" cy="194" r="5" fill="#FFFFFF" fillOpacity="0.85" />

        {/* Abstract Retinal Vascular Branch Curves */}
        <path
          d="M 200 162 C 200 120, 240 100, 270 70"
          stroke="url(#vesselStroke)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 200 238 C 200 270, 150 290, 120 330"
          stroke="url(#vesselStroke)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 238 200 C 270 200, 290 230, 330 250"
          stroke="url(#vesselStroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 162 200 C 130 200, 110 160, 75 140"
          stroke="url(#vesselStroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Floating Optic Node Dots */}
        <circle cx="270" cy="70" r="3" fill="#93C5FD" fillOpacity="0.9" />
        <circle cx="120" cy="330" r="3" fill="#93C5FD" fillOpacity="0.9" />
        <circle cx="330" cy="250" r="2.5" fill="#93C5FD" fillOpacity="0.8" />
        <circle cx="75" cy="140" r="2.5" fill="#93C5FD" fillOpacity="0.8" />

        {/* Minimal Precision Crosshair Vectors */}
        <line x1="200" y1="20" x2="200" y2="40" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="200" y1="360" x2="200" y2="380" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="20" y1="200" x2="40" y2="200" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="360" y1="200" x2="380" y2="200" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    </div>
  );
};

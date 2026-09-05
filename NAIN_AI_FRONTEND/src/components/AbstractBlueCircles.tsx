import React from "react";

export const AbstractBlueCircles: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
      {/* 1. Large Primary Organic Blue Circle anchored to left & top - creates the dramatic curved boundary */}
      <div
        className="absolute -top-24 -left-32 sm:-top-32 sm:-left-40 lg:-top-44 lg:-left-56 w-[520px] sm:w-[700px] lg:w-[900px] xl:w-[1020px] h-[520px] sm:h-[700px] lg:h-[900px] xl:h-[1020px] rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, #1D4ED8 0%, #1558D6 28%, #0A1F45 68%, #061529 100%)",
          boxShadow: "0 30px 70px -15px rgba(6, 21, 41, 0.4)",
        }}
      />

      {/* 2. Medium Vibrant Royal Blue Circle overlapping the lower-left */}
      <div
        className="absolute top-[42%] -left-20 sm:top-[38%] sm:-left-24 lg:top-[36%] lg:-left-32 w-[340px] sm:w-[460px] lg:w-[580px] h-[340px] sm:h-[460px] lg:h-[580px] rounded-full animate-float-circle"
        style={{
          background: "radial-gradient(circle at 40% 40%, #3B82F6 0%, #2563EB 40%, #1D4ED8 80%, #0F2D6B 100%)",
          boxShadow: "0 20px 50px -10px rgba(37, 99, 235, 0.35)",
          opacity: 0.95,
        }}
      />

      {/* 3. Signature Floating Iris/Optics Focal Circle - matching reference visual */}
      <div
        className="absolute bottom-[8%] left-[22%] sm:left-[30%] lg:left-[34%] xl:left-[36%] w-40 h-40 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full flex items-center justify-center border border-white/25 shadow-2xl shadow-blue-900/40 animate-float-circle"
        style={{
          background: "radial-gradient(circle at 30% 30%, #60A5FA 0%, #2563EB 55%, #1D4ED8 100%)",
          animationDelay: "1.5s",
        }}
      >
        {/* Concentric optical rings inside the focal sphere */}
        <svg className="w-full h-full p-4 opacity-50" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="86" stroke="white" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="38" stroke="white" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="14" fill="white" fillOpacity="0.85" />
          {/* Subtle crosshair markings */}
          <line x1="100" y1="20" x2="100" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="100" y1="170" x2="100" y2="180" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="100" x2="30" y2="100" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="170" y1="100" x2="180" y2="100" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* 4. Subtle Sky Blue Accent Sphere near bottom left */}
      <div
        className="absolute -bottom-16 left-6 sm:left-14 lg:left-20 w-36 h-36 sm:w-48 sm:h-48 rounded-full"
        style={{
          background: "radial-gradient(circle at 40% 40%, rgba(147, 197, 253, 0.4) 0%, rgba(59, 130, 246, 0.2) 70%, transparent 100%)",
          filter: "blur(8px)",
        }}
      />

      {/* 5. Very subtle soft blue ambient glow in top right to blend canvas smoothly */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(219, 234, 254, 0.35) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
};

import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = '', iconOnly = false }: LogoProps) {
  const viewBox = iconOnly ? "0 0 160 140" : "0 0 680 140";
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Dynamic Corporate SVG Logo: PT. Spektrum Kreasi Pratama */}
      <svg
        viewBox={viewBox}
        className={`w-full h-full ${iconOnly ? 'min-w-[36px]' : 'min-w-[150px]'}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Vibrant Deep-Blue to Electric-Cyan Gradient for Top swoosh */}
          <linearGradient id="spektrumBlueTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Electric Cyan to Sky Blue Gradient for Bottom swoosh */}
          <linearGradient id="spektrumBlueBottom" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>

          {/* Premium Metallic Silver-to-Grey Gradient for Inner Arc */}
          <linearGradient id="spektrumSilver" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Orbit Icon Symbol Section */}
        <g id="spektrum-orbit-symbol">
          {/* Top-left sweeping orbital crescent */}
          <path
            d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z"
            fill="url(#spektrumBlueTop)"
          />

          {/* Inner silver secondary high-precision stabilizer arc */}
          <path
            d="M 45 74 C 42 66, 45 52, 58 44 C 70 36, 92 32, 115 32 C 110 36, 100 40, 88 46 C 72 54, 58 64, 45 74 Z"
            fill="url(#spektrumSilver)"
            opacity="0.9"
          />

          {/* Bottom-right sweeping orbital crescent */}
          <path
            d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z"
            fill="url(#spektrumBlueBottom)"
          />

          {/* Inner silver sweeping arc counterpart */}
          <path
            d="M 124 64 C 128 72, 125 86, 112 94 C 100 102, 78 106, 55 106 C 60 102, 70 98, 82 92 C 98 84, 112 74, 124 64 Z"
            fill="url(#spektrumSilver)"
            opacity="0.8"
          />
        </g>

        {/* Corporate Typography Section (pt. spektrum kreasi pratama) */}
        {!iconOnly && (
          <g id="spektrum-brand-text">
            {/* Main Company Name - Boldly structured, slight tracking, modern & responsive fill */}
            <text
              x="165"
              y="74"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="800"
              fontSize="21"
              fill="currentColor"
              className="text-slate-900 dark:text-white"
              letterSpacing="0.05em"
            >
              PT. SPEKTRUM KREASI PRATAMA
            </text>

            {/* Sub-label explaining specialized core industry */}
            <text
              x="167"
              y="96"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
              fontSize="10"
              fill="#2563eb"
              className="text-blue-600 dark:text-cyan-400 font-mono"
              letterSpacing="0.45em"
            >
              METROLOGY & CALIBRATION
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

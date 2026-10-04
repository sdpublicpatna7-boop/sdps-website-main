import React from 'react';
import { motion } from 'framer-motion';

export default function RangoliMandala({ size = 420, className = '', opacity = 0.22 }) {
  return (
    <div
      className={`pointer-events-none select-none relative inline-flex items-center justify-center ${className}`}
      style={{ opacity }}
    >
      {/* Outer Rotating Ring (Clockwise) */}
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <circle cx="100" cy="100" r="95" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="88" stroke="#FDE047" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="75" stroke="#F59E0B" strokeWidth="1" strokeDasharray="6 3" />

        {/* 12 Outer Petals / Mandalas */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = 100 + 82 * Math.cos(angle);
          const y = 100 + 82 * Math.sin(angle);
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 30 + 90})`}>
              <path d="M0 -12 C6 -6 6 6 0 12 C-6 6 -6 -6 0 -12 Z" fill="#F59E0B" opacity="0.75" />
              <circle cx="0" cy="0" r="2.5" fill="#FEF08A" />
            </g>
          );
        })}
      </motion.svg>

      {/* Inner Counter-Rotating Ring (Counter-Clockwise) */}
      <motion.svg
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <circle cx="80" cy="80" r="65" stroke="#EC4899" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="80" cy="80" r="50" stroke="#FDE047" strokeWidth="1.2" />

        {/* 8 Inner Floral Petals */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const x = 80 + 48 * Math.cos(angle);
          const y = 80 + 48 * Math.sin(angle);
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${i * 45 + 90})`}>
              <ellipse cx="0" cy="0" rx="6" ry="14" fill="#F43F5E" opacity="0.6" />
              <ellipse cx="0" cy="0" rx="3.5" ry="9" fill="#FEF08A" opacity="0.9" />
              <circle cx="0" cy="-14" r="2" fill="#FDE047" />
            </g>
          );
        })}

        {/* Center Sacred Bindu */}
        <circle cx="80" cy="80" r="18" fill="#F59E0B" opacity="0.4" />
        <circle cx="80" cy="80" r="10" fill="#FEF08A" opacity="0.8" />
        <circle cx="80" cy="80" r="4" fill="#E11D48" />
      </motion.svg>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingDiya({ size = 48, className = '', glow = true }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glow && (
        <motion.div
          animate={{
            scale: [1, 1.25, 1.05, 1.2, 1],
            opacity: [0.65, 0.95, 0.7, 0.9, 0.65],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-3 w-10 h-10 rounded-full bg-amber-400/40 blur-md pointer-events-none"
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)]"
      >
        <defs>
          {/* Flame Gradient */}
          <radialGradient id="flameInner" cx="50%" cy="80%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#DC2626" />
          </radialGradient>

          {/* Diya Clay Gradient */}
          <linearGradient id="clayBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="40%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* Golden Rim */}
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>
        </defs>

        {/* Animated Flickering Flame */}
        <motion.g
          animate={{
            scaleY: [1, 1.15, 0.95, 1.1, 1],
            scaleX: [1, 0.92, 1.05, 0.95, 1],
            rotate: [-1, 2, -2, 1, -1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '50px 48px' }}
        >
          {/* Outer Flame Glow */}
          <path
            d="M50 14 C55 26 62 34 60 46 C58 56 42 56 40 46 C38 34 45 26 50 14 Z"
            fill="url(#flameInner)"
            opacity="0.95"
          />
          {/* Core White Hot Flame */}
          <path
            d="M50 24 C53 32 57 38 55 45 C54 50 46 50 45 45 C43 38 47 32 50 24 Z"
            fill="#FFFBEB"
          />
        </motion.g>

        {/* Cotton Wick */}
        <path
          d="M50 48 L48 42"
          stroke="#451A03"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Diya Clay Base Lamp */}
        <path
          d="M16 54 C18 72 32 84 50 84 C68 84 82 72 84 54 C74 58 58 59 50 59 C42 59 26 58 16 54 Z"
          fill="url(#clayBase)"
        />

        {/* Decorative Rim */}
        <path
          d="M14 53 C26 58 42 60 50 60 C58 60 74 58 86 53 C87 56 82 60 76 61 C64 63 56 63 50 63 C44 63 36 63 24 61 C18 60 13 56 14 53 Z"
          fill="url(#goldRim)"
        />

        {/* Base Pedestal */}
        <ellipse cx="50" cy="85" rx="16" ry="4" fill="#78350F" opacity="0.8" />

        {/* Traditional Engraving Dots */}
        <circle cx="30" cy="67" r="1.5" fill="#FDE047" />
        <circle cx="40" cy="71" r="1.5" fill="#FDE047" />
        <circle cx="50" cy="73" r="2" fill="#FDE047" />
        <circle cx="60" cy="71" r="1.5" fill="#FDE047" />
        <circle cx="70" cy="67" r="1.5" fill="#FDE047" />
      </svg>
    </div>
  );
}

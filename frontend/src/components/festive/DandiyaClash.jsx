import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function DandiyaClash({ size = 160, className = '', interactive = true }) {
  const [clashed, setClashed] = useState(false);

  const triggerClash = () => {
    if (!interactive) return;
    setClashed(true);
    setTimeout(() => setClashed(false), 500);
  };

  return (
    <div
      onClick={triggerClash}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      title="Click to strike Dandiya sticks!"
    >
      {/* Central Impact Spark Flare */}
      <motion.div
        animate={{
          scale: clashed ? [1, 2.2, 0] : [0.8, 1.4, 0.8],
          opacity: clashed ? [1, 1, 0] : [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: clashed ? 0.4 : 2,
          repeat: clashed ? 0 : Infinity,
          ease: 'easeOut',
        }}
        className="absolute w-12 h-12 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-fuchsia-400 blur-sm pointer-events-none"
      />

      <svg
        width={size}
        height={size * 0.8}
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          {/* Stick 1 Gradient (Gold & Crimson) */}
          <linearGradient id="dandiya1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="25%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="75%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Stick 2 Gradient (Magenta & Turquoise) */}
          <linearGradient id="dandiya2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="30%" stopColor="#FBBF24" />
            <stop offset="60%" stopColor="#06B6D4" />
            <stop offset="85%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>

          {/* Golden Grip */}
          <linearGradient id="goldGrip" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* Left Dandiya Stick */}
        <motion.g
          animate={{
            rotate: clashed ? [-35, -15, -35] : [-35, -28, -35],
          }}
          transition={{
            duration: clashed ? 0.35 : 1.8,
            repeat: clashed ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '40px 130px' }}
        >
          {/* Shadow */}
          <rect
            x="38"
            y="22"
            width="14"
            height="130"
            rx="7"
            fill="#000000"
            opacity="0.25"
            transform="rotate(35 45 87)"
          />
          {/* Main Body */}
          <rect
            x="36"
            y="20"
            width="14"
            height="130"
            rx="7"
            fill="url(#dandiya1)"
            stroke="#FEF08A"
            strokeWidth="1.5"
            transform="rotate(35 43 85)"
          />
          {/* Metallic Grip Rings */}
          <circle cx="85" cy="58" r="4" fill="#FEF08A" />
          <circle cx="65" cy="88" r="4" fill="#FEF08A" />
          <circle cx="45" cy="118" r="4" fill="#FEF08A" />

          {/* Pom Pom & Little Bells (Ghungroo) */}
          <circle cx="28" cy="142" r="7" fill="#F43F5E" />
          <circle cx="23" cy="148" r="3.5" fill="#FBBF24" />
          <circle cx="33" cy="148" r="3.5" fill="#FBBF24" />
        </motion.g>

        {/* Right Dandiya Stick */}
        <motion.g
          animate={{
            rotate: clashed ? [35, 15, 35] : [35, 28, 35],
          }}
          transition={{
            duration: clashed ? 0.35 : 1.8,
            repeat: clashed ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '160px 130px' }}
        >
          {/* Shadow */}
          <rect
            x="148"
            y="22"
            width="14"
            height="130"
            rx="7"
            fill="#000000"
            opacity="0.25"
            transform="rotate(-35 155 87)"
          />
          {/* Main Body */}
          <rect
            x="150"
            y="20"
            width="14"
            height="130"
            rx="7"
            fill="url(#dandiya2)"
            stroke="#FEF08A"
            strokeWidth="1.5"
            transform="rotate(-35 157 85)"
          />
          {/* Metallic Grip Rings */}
          <circle cx="115" cy="58" r="4" fill="#FEF08A" />
          <circle cx="135" cy="88" r="4" fill="#FEF08A" />
          <circle cx="155" cy="118" r="4" fill="#FEF08A" />

          {/* Pom Pom & Little Bells */}
          <circle cx="172" cy="142" r="7" fill="#8B5CF6" />
          <circle cx="167" cy="148" r="3.5" fill="#FBBF24" />
          <circle cx="177" cy="148" r="3.5" fill="#FBBF24" />
        </motion.g>

        {/* Sparkle Burst Points at Cross Section */}
        <motion.g
          animate={{
            scale: [0.8, 1.3, 0.8],
            rotate: [0, 90, 180],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: '100px 75px' }}
        >
          <polygon
            points="100,55 104,70 120,75 104,80 100,95 96,80 80,75 96,70"
            fill="#FEF08A"
          />
          <circle cx="100" cy="75" r="4" fill="#FFFFFF" />
        </motion.g>
      </svg>
    </div>
  );
}

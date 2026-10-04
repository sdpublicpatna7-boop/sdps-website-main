import React from 'react';
import { motion } from 'framer-motion';

export default function ToranGarland() {
  const items = Array.from({ length: 16 });

  return (
    <div className="w-full overflow-hidden pointer-events-none select-none relative -mt-1 z-30 h-10 flex justify-between items-start opacity-90">
      {/* String */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 shadow-sm" />

      {/* Repeating Garland Elements */}
      <div className="flex justify-between w-full max-w-7xl mx-auto px-2">
        {items.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 3 : -3, i % 2 === 0 ? -3 : 3],
              y: [0, 2, 0],
            }}
            transition={{
              duration: 3.5 + (i % 3) * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex flex-col items-center origin-top -mt-0.5"
          >
            {/* Thread */}
            <div className="w-[1px] h-1.5 bg-amber-700/60" />

            {/* Marigold Flower (Yellow/Orange) */}
            <div className="relative">
              <div
                className={`w-4 h-4 rounded-full ${
                  i % 3 === 0
                    ? 'bg-gradient-to-tr from-amber-600 to-yellow-400'
                    : i % 3 === 1
                    ? 'bg-gradient-to-tr from-orange-600 to-amber-300'
                    : 'bg-gradient-to-tr from-rose-600 to-amber-400'
                } shadow-[0_2px_6px_rgba(245,158,11,0.6)] flex items-center justify-center border border-amber-300/40`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-900/30" />
              </div>

              {/* Mango leaf underneath */}
              {i % 2 === 0 && (
                <div className="w-2.5 h-5 bg-gradient-to-b from-emerald-600 to-green-700 rounded-b-full mx-auto -mt-1 shadow-sm border-t border-emerald-400/30" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-emerald-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 1 }}>
      
      <motion.div
        initial={{ scale: 0 }}
        animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-40 h-40 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/50 rotate-12"
      >
        <span className="text-white text-8xl font-bold -rotate-12">W</span>
      </motion.div>

      <motion.h1 className="text-7xl font-extrabold text-white mb-6 tracking-tight"
        initial={{ y: 30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
        transition={{ delay: 0.2 }}
      >
        وصال
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        <div className="px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-3xl shadow-lg">
          حمل التطبيق الآن
        </div>
      </motion.div>
    </motion.div>
  );
}

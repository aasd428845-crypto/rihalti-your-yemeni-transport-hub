import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}>
      
      <div className="relative text-center">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/50">
            <span className="text-white text-6xl font-bold">W</span>
          </div>
          <h1 className="text-6xl font-extrabold text-white mb-4 tracking-tight">وصال</h1>
        </motion.div>

        <motion.div className="overflow-hidden h-20"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.p className="text-3xl text-emerald-100 font-medium"
            initial={{ y: "100%" }}
            animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            تطبيق واحد لكل احتياجاتك
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}

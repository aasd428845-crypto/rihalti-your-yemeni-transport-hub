import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-start px-24 z-10"
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}>
      
      <div className="w-1/2">
        <motion.h2 className="text-5xl font-bold text-white mb-6 leading-tight"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6 }}
        >
          توصيل لوجستي
          <br/>
          <span className="text-emerald-400">سريع وآمن</span>
        </motion.h2>
        
        <motion.p className="text-2xl text-emerald-100"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          أرسل واستقبل طرودك بكل ثقة وموثوقية في أي وقت ومن أي مكان.
        </motion.p>
      </div>

      <motion.div className="absolute left-24 w-1/3 aspect-square border-4 border-emerald-500/30 rounded-full flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <motion.div className="w-4 h-4 bg-emerald-400 rounded-full absolute -top-2" />
        <motion.div className="w-4 h-4 bg-emerald-400 rounded-full absolute -bottom-2" />
      </motion.div>
    </motion.div>
  );
}

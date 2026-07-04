import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-end px-24 z-10"
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}>
      
      <div className="w-1/2 text-left" dir="ltr">
        <motion.h2 className="text-5xl font-bold text-white mb-6 leading-tight text-right" dir="rtl"
          initial={{ opacity: 0, y: -50 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          أشهى المأكولات
          <br/>
          <span className="text-emerald-400">إلى باب بيتك</span>
        </motion.h2>
        
        <motion.p className="text-2xl text-emerald-100 text-right" dir="rtl"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          اطلب طعامك المفضل من أفضل المطاعم في مدينتك.
        </motion.p>
      </div>

      <motion.div className="absolute right-24 w-1/3 aspect-square bg-emerald-600/20 backdrop-blur-md rounded-3xl"
        initial={{ rotate: -15, scale: 0.8 }}
        animate={phase >= 1 ? { rotate: 0, scale: 1 } : { rotate: -15, scale: 0.8 }}
        transition={{ type: "spring", duration: 1.5 }}
      />
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
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
    <motion.div className="absolute inset-0 flex items-center justify-center px-24 z-10"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "-100%", opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}>
      
      <div className="text-center w-2/3">
        <motion.h2 className="text-6xl font-bold text-white mb-6 leading-tight"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          رحلات آمنة
          <br/>
          <span className="text-emerald-400">بأسعار منافسة</span>
        </motion.h2>
        
        <motion.p className="text-2xl text-emerald-100"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          احجز رحلتك بسهولة وتنقّل براحة وأمان مع خدمة النقل المتكاملة.
        </motion.p>
      </div>
    </motion.div>
  );
}

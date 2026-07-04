import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '../../lib/videoPlayer';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 4000, logistics: 4500, food: 4500, ride: 4500, close: 4000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-emerald-950 font-sans" dir="rtl">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div className="absolute w-[80vw] h-[80vw] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #10b981, transparent)' }}
          animate={{ x: ['-20%', '50%', '10%'], y: ['10%', '60%', '20%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[60vw] h-[60vw] rounded-full opacity-20 blur-3xl right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #059669, transparent)' }}
          animate={{ x: ['10%', '-30%', '5%'], y: ['-10%', '-40%', '-15%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="logistics" />}
        {currentScene === 2 && <Scene3 key="food" />}
        {currentScene === 3 && <Scene4 key="ride" />}
        {currentScene === 4 && <Scene5 key="close" />}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const sceneKeys = Object.keys(durations);
    if (sceneKeys.length === 0) return;

    let timeoutId: NodeJS.Timeout;

    const playScene = (index: number) => {
      setCurrentScene(index);
      const sceneKey = sceneKeys[index];
      const duration = durations[sceneKey];

      timeoutId = setTimeout(() => {
        playScene((index + 1) % sceneKeys.length);
      }, duration);
    };

    playScene(0);

    return () => clearTimeout(timeoutId);
  }, [JSON.stringify(durations)]);

  return { currentScene };
}

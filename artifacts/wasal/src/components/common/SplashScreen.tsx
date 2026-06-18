import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen = ({ onDone }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 200);
    const t2 = setTimeout(() => setPhase("exit"), 1600);
    const t3 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
      style={{
        backgroundColor: "#0f5e59",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.5s ease-in-out" : phase === "enter" ? "opacity 0.3s ease-out" : "none",
        pointerEvents: "none",
      }}
    >
      <img
        src="/icons/wasal-logo-official.png"
        alt="وصال"
        style={{
          width: 148,
          height: 148,
          borderRadius: 36,
          objectFit: "cover",
          transform: phase === "enter" ? "scale(0.82)" : "scale(1)",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
};

export default SplashScreen;

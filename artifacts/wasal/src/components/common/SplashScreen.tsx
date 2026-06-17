import { useEffect, useState } from "react";
import BikeDeliveryIcon from "./BikeDeliveryIcon";

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
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transform: phase === "enter" ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <BikeDeliveryIcon size={100} color="white" boxLineColor="rgba(15,94,89,0.35)" />
        <span
          style={{
            color: "white",
            fontFamily: "'Cairo', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          Wasal
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;

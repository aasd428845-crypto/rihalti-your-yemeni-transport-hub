import { useEffect, useState } from "react";

const ScooterIcon = ({ size = 80 }: { size?: number }) => (
  <svg
    width={size}
    height={size * 0.67}
    viewBox="0 0 120 80"
    fill="white"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="18" width="26" height="20" rx="3" fill="white" />
    <line x1="17" y1="18" x2="17" y2="38" stroke="#1a5c3a" strokeWidth="2" />
    <line x1="4" y1="28" x2="30" y2="28" stroke="#1a5c3a" strokeWidth="2" />
    <path d="M28 34 Q36 18 52 16 L70 16 Q80 16 84 26 L87 34" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="46" y="9" width="26" height="9" rx="4.5" fill="white" />
    <path d="M26 36 Q28 44 34 47" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M87 34 L91 46" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
    <rect x="75" y="12" width="4" height="17" rx="2" fill="white" />
    <rect x="72" y="11" width="19" height="4.5" rx="2.25" fill="white" />
    <polygon points="64,6 58,15 63,15 57,24 68,13 62,13" fill="white" opacity="0.9" />
    <circle cx="28" cy="58" r="16" stroke="white" strokeWidth="5" fill="none" />
    <circle cx="28" cy="58" r="4" fill="white" />
    <circle cx="93" cy="58" r="16" stroke="white" strokeWidth="5" fill="none" />
    <circle cx="93" cy="58" r="4" fill="white" />
  </svg>
);

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
        backgroundColor: "#1a5c3a",
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit" ? "opacity 0.5s ease-in-out" : phase === "enter" ? "opacity 0.3s ease-out" : "none",
        pointerEvents: "none",
      }}
    >
      {/* Circle badge */}
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
        <ScooterIcon size={96} />
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

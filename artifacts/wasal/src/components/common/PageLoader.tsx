import { useEffect, useState } from "react";

const PageLoader = () => {
  const [width, setWidth] = useState(8);

  useEffect(() => {
    const t1 = setTimeout(() => setWidth(35), 60);
    const t2 = setTimeout(() => setWidth(60), 250);
    const t3 = setTimeout(() => setWidth(80), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] pointer-events-none">
      <div
        className="h-[3px] transition-all duration-500 ease-out"
        style={{
          width: `${width}%`,
          background: "linear-gradient(90deg, hsl(153 82% 27%), hsl(38 92% 50%), hsl(153 82% 27%))",
          boxShadow: "0 0 10px hsl(153 82% 27% / 0.6)",
        }}
      />
    </div>
  );
};

export default PageLoader;

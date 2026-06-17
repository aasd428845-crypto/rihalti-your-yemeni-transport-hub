const BikeDeliveryIcon = ({
  size = 80,
  color = "white",
  boxLineColor = "rgba(0,0,0,0.18)",
}: {
  size?: number;
  color?: string;
  boxLineColor?: string;
}) => {
  const h = Math.round(size * (80 / 120));
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="21" width="30" height="21" rx="3.5" fill={color} />
      <rect x="5" y="15" width="26" height="7" rx="3.5" fill={color} />
      <line x1="18" y1="21" x2="18" y2="42" stroke={boxLineColor} strokeWidth="1.3" />
      <line x1="3" y1="31.5" x2="33" y2="31.5" stroke={boxLineColor} strokeWidth="1.3" />

      <line x1="33" y1="27" x2="51" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="33" y1="40" x2="28" y2="60" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

      <line x1="51" y1="26" x2="55" y2="56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="51" y1="26" x2="80" y2="24" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="24" x2="55" y2="56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="55" y1="56" x2="28" y2="60" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="51" y1="26" x2="28" y2="60" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="24" x2="90" y2="60" stroke={color} strokeWidth="4" strokeLinecap="round" />

      <rect x="41" y="19" width="22" height="7" rx="3.5" fill={color} />

      <rect x="80" y="12" width="4" height="13" rx="2" fill={color} />
      <rect x="76" y="10" width="16" height="4.5" rx="2.25" fill={color} />

      <circle cx="28" cy="60" r="15" stroke={color} strokeWidth="4.5" />
      <circle cx="28" cy="60" r="4" fill={color} />

      <circle cx="90" cy="60" r="15" stroke={color} strokeWidth="4.5" />
      <circle cx="90" cy="60" r="4" fill={color} />
    </svg>
  );
};

export default BikeDeliveryIcon;

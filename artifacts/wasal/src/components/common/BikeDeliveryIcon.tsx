const WasalLogo = ({
  size = 40,
}: {
  size?: number;
  color?: string;
  boxLineColor?: string;
}) => (
  <img
    src="/icons/wasal-logo-official.png"
    width={size}
    height={size}
    alt="وصال"
    style={{ objectFit: "cover", borderRadius: Math.round(size * 0.22), display: "block", flexShrink: 0 }}
  />
);

export default WasalLogo;

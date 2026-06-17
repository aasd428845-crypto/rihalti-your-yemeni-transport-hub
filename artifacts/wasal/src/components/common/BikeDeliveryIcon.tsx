const FILTER_WHITE = "brightness(0) invert(1)";
const FILTER_GREEN = "brightness(0) saturate(100%) invert(22%) sepia(97%) saturate(518%) hue-rotate(138deg) brightness(91%) contrast(97%)";

const getFilter = (color: string) => {
  if (color === "white") return FILTER_WHITE;
  if (color.includes("0f5e59") || color.includes("1a5c3a")) return FILTER_GREEN;
  return FILTER_WHITE;
};

const BikeDeliveryIcon = ({
  size = 80,
  color = "white",
}: {
  size?: number;
  color?: string;
  boxLineColor?: string;
}) => {
  const width = size;
  const height = Math.round(size * 0.82);
  return (
    <img
      src="/icons/delivery-rider-nobg.png"
      width={width}
      height={height}
      alt=""
      style={{
        filter: getFilter(color),
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
};

export default BikeDeliveryIcon;

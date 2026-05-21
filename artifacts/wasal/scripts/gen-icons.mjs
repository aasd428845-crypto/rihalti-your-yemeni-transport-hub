import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconDir = path.join(__dirname, "../public/icons");
mkdirSync(iconDir, { recursive: true });

// ── Scooter SVG (white on transparent, viewBox 0 0 120 80) ──────────────────
const scooterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" fill="white">
  <!-- Delivery box (front) -->
  <rect x="4" y="18" width="26" height="20" rx="3" fill="white"/>
  <line x1="17" y1="18" x2="17" y2="38" stroke="#1a5c3a" stroke-width="2"/>
  <line x1="4" y1="28" x2="30" y2="28" stroke="#1a5c3a" stroke-width="2"/>
  <!-- Body frame -->
  <path d="M28 34 Q36 18 52 16 L70 16 Q80 16 84 26 L87 34" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Seat -->
  <rect x="46" y="9" width="26" height="9" rx="4.5" fill="white"/>
  <!-- Rear fender -->
  <path d="M26 36 Q28 44 34 47" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- Front fork -->
  <path d="M87 34 L91 46" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- Handlebar post -->
  <rect x="75" y="12" width="4" height="17" rx="2" fill="white"/>
  <!-- Handlebar -->
  <rect x="72" y="11" width="19" height="4.5" rx="2.25" fill="white"/>
  <!-- Lightning bolt (electric) -->
  <polygon points="64,6 58,15 63,15 57,24 68,13 62,13" fill="white" opacity="0.9"/>
  <!-- Back wheel -->
  <circle cx="28" cy="58" r="16" stroke="white" stroke-width="5" fill="none"/>
  <circle cx="28" cy="58" r="4" fill="white"/>
  <!-- Front wheel -->
  <circle cx="93" cy="58" r="16" stroke="white" stroke-width="5" fill="none"/>
  <circle cx="93" cy="58" r="4" fill="white"/>
</svg>`;

// ── 192×192 icon: sharp square, green background ─────────────────────────────
const icon192Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
  <rect width="192" height="192" fill="#1a5c3a"/>
  <g transform="translate(36, 56) scale(1.0)">
    ${scooterSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
</svg>`;

// ── 512×512 icon: same design, larger ────────────────────────────────────────
const icon512Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#1a5c3a"/>
  <g transform="translate(96, 150) scale(2.67)">
    ${scooterSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
</svg>`;

// ── Favicon 32×32 ─────────────────────────────────────────────────────────────
const favicon32Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
  <rect width="32" height="32" fill="#1a5c3a" rx="4"/>
  <g transform="translate(4, 9) scale(0.2)">
    ${scooterSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
</svg>`;

// Write SVG files
const svgPath192  = path.join(iconDir, "icon-192x192.svg");
const svgPath512  = path.join(iconDir, "icon-512x512.svg");
const svgFavicon  = path.join(iconDir, "favicon-32.svg");

writeFileSync(svgPath192, icon192Svg, "utf8");
writeFileSync(svgPath512, icon512Svg, "utf8");
writeFileSync(svgFavicon, favicon32Svg, "utf8");
console.log("SVG files written");

// Convert with ImageMagick
const convert = "/nix/store/jrwz4hirdm6zk788v223rhsnp1qd27j2-replit-runtime-path/bin/convert";

try {
  execSync(`${convert} -background none -density 192 "${svgPath192}" "${path.join(iconDir, "icon-192x192.png")}"`, { stdio: "inherit" });
  console.log("✓ icon-192x192.png");
} catch (e) { console.error("192 failed:", e.message); }

try {
  execSync(`${convert} -background none -density 512 "${svgPath512}" "${path.join(iconDir, "icon-512x512.png")}"`, { stdio: "inherit" });
  console.log("✓ icon-512x512.png");
} catch (e) { console.error("512 failed:", e.message); }

try {
  execSync(`${convert} -background none "${svgFavicon}" "${path.join(__dirname, "../public/favicon.png")}"`, { stdio: "inherit" });
  console.log("✓ favicon.png");
} catch (e) { console.error("favicon failed:", e.message); }

console.log("Done!");

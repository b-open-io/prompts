/**
 * Artistic QR renderer.
 *
 * Strategy: use the qrcode library only for matrix generation (high error correction),
 * then render the SVG ourselves with:
 *   - Round dots instead of squares for data modules
 *   - Rounded-square "eye" pattern for the 3 finder corners (custom shape)
 *   - A center logo overlay (bOpen wordmark on white, ~22% of QR width)
 *
 * Error correction level H tolerates ~30% damage, so the centered logo overlay
 * is recoverable and the QR still scans reliably.
 */
import QRCode from "qrcode";

export type ArtisticQROptions = {
  url: string;
  size?: number;            // viewBox size — output is vector, this is internal units
  fg?: string;
  bg?: string;              // null/undefined = transparent
  dotShape?: "circle" | "square" | "rounded";
  logoSvg?: string;         // inline <svg>…</svg> to render in center
  logoScale?: number;       // fraction of QR width occupied by logo (default 0.22)
  /** Number of QR modules of clear margin around the data (the "quiet zone"
   *  scanners need to reliably lock on). Default 0 assumes the parent
   *  container provides the margin. Set to 2-4 when rendering the QR
   *  directly onto a non-uniform surface (e.g. a watercolor) so it carries
   *  its own white safe area. */
  quietZone?: number;
};

export async function renderArtisticQR(opts: ArtisticQROptions): Promise<string> {
  const {
    url,
    size = 1000,
    fg = "#000000",
    bg,
    dotShape = "circle",
    logoSvg,
    logoScale = 0.22,
    quietZone = 0,
  } = opts;

  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const moduleCount: number = qr.modules.size;
  const data: Uint8Array = qr.modules.data;
  // Data + quiet zone share the viewBox. moduleSize is calibrated against
  // the data area only; the quiet zone sits outside the data via a translate.
  const dataCount = moduleCount;
  const totalCount = moduleCount + 2 * quietZone;
  const moduleSize = size / totalCount;
  const quietOffset = quietZone * moduleSize;

  // Identify finder-pattern regions (3 corners, 7×7 each).
  // We'll skip drawing data modules inside them and draw a custom "eye" instead.
  const finderTopLeft = { row: 0, col: 0 };
  const finderTopRight = { row: 0, col: moduleCount - 7 };
  const finderBottomLeft = { row: moduleCount - 7, col: 0 };
  const finders = [finderTopLeft, finderTopRight, finderBottomLeft];

  function inFinder(r: number, c: number): boolean {
    for (const f of finders) {
      if (r >= f.row && r < f.row + 7 && c >= f.col && c < f.col + 7) return true;
    }
    return false;
  }

  function isOn(r: number, c: number): boolean {
    return data[r * moduleCount + c] === 1;
  }

  const shapes: string[] = [];

  // Data modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!isOn(r, c) || inFinder(r, c)) continue;
      const x = c * moduleSize;
      const y = r * moduleSize;
      if (dotShape === "circle") {
        const cx = x + moduleSize / 2;
        const cy = y + moduleSize / 2;
        const radius = moduleSize / 2 * 0.92;
        shapes.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius.toFixed(2)}"/>`);
      } else if (dotShape === "rounded") {
        const r1 = moduleSize * 0.3;
        shapes.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" rx="${r1.toFixed(2)}" ry="${r1.toFixed(2)}"/>`);
      } else {
        shapes.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}"/>`);
      }
    }
  }

  // Custom finder eyes — rounded-square outer frame with a rounded-square inner pip.
  for (const f of finders) {
    const x = f.col * moduleSize;
    const y = f.row * moduleSize;
    const outerSize = 7 * moduleSize;
    const innerStrokeWidth = moduleSize;
    const outerRadius = moduleSize * 1.6;
    const pipX = x + 2 * moduleSize;
    const pipY = y + 2 * moduleSize;
    const pipSize = 3 * moduleSize;
    const pipRadius = moduleSize * 0.6;

    // Outer ring (drawn as filled outer rounded rect minus filled inner rounded rect)
    shapes.push(`<path d="
      M ${x} ${y + outerRadius}
      Q ${x} ${y} ${x + outerRadius} ${y}
      L ${x + outerSize - outerRadius} ${y}
      Q ${x + outerSize} ${y} ${x + outerSize} ${y + outerRadius}
      L ${x + outerSize} ${y + outerSize - outerRadius}
      Q ${x + outerSize} ${y + outerSize} ${x + outerSize - outerRadius} ${y + outerSize}
      L ${x + outerRadius} ${y + outerSize}
      Q ${x} ${y + outerSize} ${x} ${y + outerSize - outerRadius}
      Z
      M ${x + innerStrokeWidth} ${y + outerRadius - innerStrokeWidth * 0.3}
      L ${x + innerStrokeWidth} ${y + outerSize - innerStrokeWidth}
      L ${x + outerSize - innerStrokeWidth} ${y + outerSize - innerStrokeWidth}
      L ${x + outerSize - innerStrokeWidth} ${y + innerStrokeWidth}
      L ${x + outerRadius - innerStrokeWidth * 0.3} ${y + innerStrokeWidth}
      Z" fill-rule="evenodd"/>`);
    // Inner pip
    shapes.push(`<rect x="${pipX.toFixed(2)}" y="${pipY.toFixed(2)}" width="${pipSize.toFixed(2)}" height="${pipSize.toFixed(2)}" rx="${pipRadius.toFixed(2)}" ry="${pipRadius.toFixed(2)}"/>`);
  }

  const bgRect = bg
    ? `<rect width="${size}" height="${size}" fill="${bg}"/>`
    : "";

  // Center logo overlay
  let logoBlock = "";
  if (logoSvg) {
    const logoSize = size * logoScale;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    // White background pad behind the logo for contrast + scan reliability
    const padPadding = size * 0.02;
    const padSize = logoSize + padPadding * 2;
    const padX = logoX - padPadding;
    const padY = logoY - padPadding;
    const padRadius = padSize * 0.18;
    // Strip the outer <svg ...> wrapper so we can re-wrap with our own viewBox
    const inner = logoSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const viewBoxMatch = logoSvg.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 100 100";
    logoBlock = `
      <rect x="${padX}" y="${padY}" width="${padSize}" height="${padSize}" rx="${padRadius}" ry="${padRadius}" fill="#ffffff"/>
      <svg x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>
    `;
  }

  // The data modules + finder eyes are computed in their own coordinate
  // space (data starts at 0,0). When a quiet zone is requested, shift the
  // whole content inward by quietOffset so the bg fill is visible around
  // the data. The center-logo block is in viewBox coords already (computed
  // from `size`) and stays at the visual center, so it doesn't need the
  // shift — keep it outside the translated group.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%">
    ${bgRect}
    <g fill="${fg}" transform="translate(${quietOffset} ${quietOffset})">${shapes.join("")}</g>
    ${logoBlock}
  </svg>`;
}

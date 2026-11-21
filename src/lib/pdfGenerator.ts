export interface ScannedPdfPage {
  jpegBytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Generates a standard multi-page PDF 1.4 file (Blob) embedding one or more
 * scanned JPEG pages, fitted proportionally onto A4 pages (or page-matched aspect ratio).
 * Zero external dependencies required.
 */
export function generateMultiPagePdfBlob(pages: ScannedPdfPage[]): Blob {
  if (pages.length === 0) {
    throw new Error("At least one page is required to generate a PDF.");
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;

  function pushString(str: string) {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  }

  function pushBytes(bytes: Uint8Array) {
    chunks.push(bytes);
    byteOffset += bytes.length;
  }

  // Object ID layout:
  // 1: Catalog
  // 2: Pages Tree
  // For each page i (0..N-1):
  //   pageObjId  = 3 + i * 3
  //   imgObjId   = 3 + i * 3 + 1
  //   contObjId  = 3 + i * 3 + 2
  const totalObjects = 2 + pages.length * 3;
  const offsets: number[] = new Array(totalObjects + 1).fill(0);

  // Header (with binary comment marker)
  pushString("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  // Object 1: Catalog
  offsets[1] = byteOffset;
  pushString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Object 2: Pages
  const kidsRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  offsets[2] = byteOffset;
  pushString(
    `2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pages.length} >>\nendobj\n`
  );

  // Standard A4 dimensions in PDF points (72 pt/inch)
  const A4_SHORT = 595.28;
  const A4_LONG = 841.89;

  pages.forEach((page, i) => {
    const pageObjId = 3 + i * 3;
    const imgObjId = pageObjId + 1;
    const contObjId = pageObjId + 2;

    const isLandscape = page.width > page.height;
    const pageW = isLandscape ? A4_LONG : A4_SHORT;
    const pageH = isLandscape ? A4_SHORT : A4_LONG;

    // Fit image inside the page with a subtle 12pt margin so it looks like a real scanned sheet
    const margin = 12;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const scale = Math.min(availW / page.width, availH / page.height);
    const drawW = (page.width * scale).toFixed(2);
    const drawH = (page.height * scale).toFixed(2);
    const drawX = ((pageW - page.width * scale) / 2).toFixed(2);
    const drawY = ((pageH - page.height * scale) / 2).toFixed(2);

    // Page Object
    offsets[pageObjId] = byteOffset;
    pushString(
      `${pageObjId} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pageW.toFixed(
          2
        )} ${pageH.toFixed(2)} ] ` +
        `/Resources << /XObject << /Im0 ${imgObjId} 0 R >> >> ` +
        `/Contents ${contObjId} 0 R >>\n` +
        `endobj\n`
    );

    // Image XObject (DCTDecode raw JPEG stream)
    offsets[imgObjId] = byteOffset;
    pushString(
      `${imgObjId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpegBytes.length} >>\n` +
        `stream\n`
    );
    pushBytes(page.jpegBytes);
    pushString("\nendstream\nendobj\n");

    // Content Stream (draws the image onto the page)
    const contentStream = `q\n${drawW} 0 0 ${drawH} ${drawX} ${drawY} cm\n/Im0 Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    offsets[contObjId] = byteOffset;
    pushString(
      `${contObjId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`
    );
    pushBytes(contentBytes);
    pushString("endstream\nendobj\n");
  });

  // Cross-Reference Table (xref)
  const xrefOffset = byteOffset;
  pushString(`xref\n0 ${totalObjects + 1}\n`);
  pushString("0000000000 65535 f \n");
  for (let id = 1; id <= totalObjects; id++) {
    const padded = String(offsets[id]).padStart(10, "0");
    pushString(`${padded} 00000 n \n`);
  }

  // Trailer
  pushString(
    `trailer\n<< /Size ${
      totalObjects + 1
    } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return new Blob(chunks as unknown as BlobPart[], {
    type: "application/pdf",
  });
}

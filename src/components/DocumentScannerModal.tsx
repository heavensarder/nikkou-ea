"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { generateMultiPagePdfBlob, ScannedPdfPage } from "@/lib/pdfGenerator";
import {
  Camera,
  RotateCw,
  Sparkles,
  X,
  SlidersHorizontal,
  Loader2,
  Crop,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Check,
  RotateCcw,
} from "lucide-react";

export type ScanFilterMode = "magic" | "bw" | "grayscale" | "original";

interface ScanPageConfig {
  id: string;
  file: File;
  imgElement: HTMLImageElement | null;
  filterMode: ScanFilterMode;
  rotation: number;
  contrastBoost: number;
  // Crop box in percentage of the rotated image (0..100)
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

interface DocumentScannerModalProps {
  isOpen: boolean;
  imageFile: File | null;
  documentLabel: string;
  onClose: () => void;
  onSaveScan: (scannedFile: File) => Promise<void> | void;
}

type DragHandleType =
  | "tl"
  | "tr"
  | "bl"
  | "br"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "move"
  | null;

/**
 * First draws the rotated full image to an intermediate canvas, then crops
 * according to cropLeft/cropRight/cropTop/cropBottom (unless ignoreCrop=true for crop editor mode),
 * and applies the selected CamScanner filter.
 */
function renderPageToCanvas(
  page: ScanPageConfig,
  targetCanvas: HTMLCanvasElement,
  maxDim = 1600,
  ignoreCrop = false
) {
  const img = page.imgElement;
  if (!img) return;

  // Step 1: Draw full rotated source image onto an offscreen canvas
  const isRotated90 = page.rotation === 90 || page.rotation === 270;
  const fullRotW = isRotated90 ? img.height : img.width;
  const fullRotH = isRotated90 ? img.width : img.height;

  const rotScale = Math.min(1, maxDim / Math.max(fullRotW, fullRotH));
  const scaledRotW = Math.max(1, Math.round(fullRotW * rotScale));
  const scaledRotH = Math.max(1, Math.round(fullRotH * rotScale));

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = scaledRotW;
  rotCanvas.height = scaledRotH;
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) return;

  const drawImgW = Math.round(img.width * rotScale);
  const drawImgH = Math.round(img.height * rotScale);

  rotCtx.save();
  rotCtx.translate(scaledRotW / 2, scaledRotH / 2);
  rotCtx.rotate((page.rotation * Math.PI) / 180);
  rotCtx.drawImage(img, -drawImgW / 2, -drawImgH / 2, drawImgW, drawImgH);
  rotCtx.restore();

  // Step 2: Crop region in rotated coordinates
  const cLeft = ignoreCrop ? 0 : page.cropLeft;
  const cRight = ignoreCrop ? 0 : page.cropRight;
  const cTop = ignoreCrop ? 0 : page.cropTop;
  const cBottom = ignoreCrop ? 0 : page.cropBottom;

  const srcX = Math.round((cLeft / 100) * scaledRotW);
  const srcY = Math.round((cTop / 100) * scaledRotH);
  const srcW = Math.max(
    40,
    Math.round(((100 - cLeft - cRight) / 100) * scaledRotW)
  );
  const srcH = Math.max(
    40,
    Math.round(((100 - cTop - cBottom) / 100) * scaledRotH)
  );

  targetCanvas.width = srcW;
  targetCanvas.height = srcH;
  const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.drawImage(rotCanvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

  // In Crop Mode we show the clear rotated image so user can see the full paper and edges
  if (ignoreCrop || page.filterMode === "original") return;

  const imageData = ctx.getImageData(
    0,
    0,
    targetCanvas.width,
    targetCanvas.height
  );
  const data = imageData.data;

  const whiteThreshold = 205 - Math.round((page.contrastBoost / 100) * 45);
  const darkFloor = 45 + Math.round((page.contrastBoost / 100) * 35);
  const range = Math.max(1, whiteThreshold - darkFloor);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (page.filterMode === "magic") {
      if (lum >= whiteThreshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        const norm = Math.max(0, (lum - darkFloor) / range);
        const targetLum = Math.pow(norm, 0.85) * 255;
        const ratio = lum > 1 ? targetLum / lum : 0;

        const avg = (r + g + b) / 3;
        const satR = avg + (r - avg) * 1.25;
        const satG = avg + (g - avg) * 1.25;
        const satB = avg + (b - avg) * 1.25;

        data[i] = Math.min(255, Math.max(0, Math.round(satR * ratio)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(satG * ratio)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(satB * ratio)));
      }
    } else if (page.filterMode === "bw") {
      const bwCutoff =
        145 - Math.round(((page.contrastBoost - 35) / 100) * 40);
      if (lum >= whiteThreshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else if (lum <= darkFloor || lum < bwCutoff) {
        const v = lum < bwCutoff - 25 ? 15 : Math.round((lum / bwCutoff) * 90);
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    } else if (page.filterMode === "grayscale") {
      let gray = lum;
      if (lum >= whiteThreshold) {
        gray = 255;
      } else if (lum <= darkFloor) {
        gray = Math.round(lum * 0.4);
      } else {
        gray = Math.round(((lum - darkFloor) / range) * 255);
      }
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Automatically detects the document/paper boundaries inside a camera photo
 * by comparing center paper brightness against outer edges, falling back to a 5% inset frame.
 */
function detectAutoDocumentCrop(img: HTMLImageElement): {
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
} {
  try {
    const W = 120;
    const H = 120;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { cropTop: 5, cropBottom: 5, cropLeft: 5, cropRight: 5 };
    }

    ctx.drawImage(img, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data;

    const getLum = (x: number, y: number) => {
      const idx = (y * W + x) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };

    // Sample center paper brightness (inner 30%..70%)
    let centerSum = 0;
    let centerCount = 0;
    for (let y = Math.floor(H * 0.3); y < Math.floor(H * 0.7); y += 2) {
      for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x += 2) {
        centerSum += getLum(x, y);
        centerCount++;
      }
    }
    const centerLum = centerCount > 0 ? centerSum / centerCount : 180;

    // Sample outer border brightness
    let borderSum = 0;
    let borderCount = 0;
    for (let x = 0; x < W; x += 2) {
      borderSum += getLum(x, 1) + getLum(x, H - 2);
      borderCount += 2;
    }
    for (let y = 0; y < H; y += 2) {
      borderSum += getLum(1, y) + getLum(W - 2, y);
      borderCount += 2;
    }
    const borderLum = borderCount > 0 ? borderSum / borderCount : centerLum;

    // If outer background is noticeably darker than the paper in the center, detect the 4 edges
    if (centerLum - borderLum > 18) {
      const threshold = borderLum + (centerLum - borderLum) * 0.48;
      const maxInset = Math.floor(W * 0.32);

      let topRow = 4;
      for (let y = 2; y < maxInset; y++) {
        let sum = 0;
        let cnt = 0;
        for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x += 2) {
          sum += getLum(x, y);
          cnt++;
        }
        if (sum / cnt >= threshold) {
          topRow = Math.max(2, y - 1);
          break;
        }
      }

      let bottomRow = 4;
      for (let y = 2; y < maxInset; y++) {
        let sum = 0;
        let cnt = 0;
        for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x += 2) {
          sum += getLum(x, H - 1 - y);
          cnt++;
        }
        if (sum / cnt >= threshold) {
          bottomRow = Math.max(2, y - 1);
          break;
        }
      }

      let leftCol = 4;
      for (let x = 2; x < maxInset; x++) {
        let sum = 0;
        let cnt = 0;
        for (let y = Math.floor(H * 0.25); y < Math.floor(H * 0.75); y += 2) {
          sum += getLum(x, y);
          cnt++;
        }
        if (sum / cnt >= threshold) {
          leftCol = Math.max(2, x - 1);
          break;
        }
      }

      let rightCol = 4;
      for (let x = 2; x < maxInset; x++) {
        let sum = 0;
        let cnt = 0;
        for (let y = Math.floor(H * 0.25); y < Math.floor(H * 0.75); y += 2) {
          sum += getLum(W - 1 - x, y);
          cnt++;
        }
        if (sum / cnt >= threshold) {
          rightCol = Math.max(2, x - 1);
          break;
        }
      }

      return {
        cropTop: Math.round((topRow / H) * 1000) / 10,
        cropBottom: Math.round((bottomRow / H) * 1000) / 10,
        cropLeft: Math.round((leftCol / W) * 1000) / 10,
        cropRight: Math.round((rightCol / W) * 1000) / 10,
      };
    }
  } catch {
    // Fallback to default inset
  }

  return { cropTop: 5, cropBottom: 5, cropLeft: 5, cropRight: 5 };
}

export default function DocumentScannerModal({
  isOpen,
  imageFile,
  documentLabel,
  onClose,
  onSaveScan,
}: DocumentScannerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const addPageInputRef = useRef<HTMLInputElement | null>(null);

  const [pages, setPages] = useState<ScanPageConfig[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [saving, setSaving] = useState<"pdf" | "jpg" | null>(null);

  // Dragging state for interactive crop handles
  const dragStateRef = useRef<{
    handle: DragHandleType;
    startX: number;
    startY: number;
    startTop: number;
    startBottom: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  const loadFileAsPage = useCallback(async (file: File): Promise<ScanPageConfig> => {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const autoBounds = detectAutoDocumentCrop(img);

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      imgElement: img,
      filterMode: "magic",
      rotation: 0,
      contrastBoost: 35,
      cropTop: autoBounds.cropTop,
      cropBottom: autoBounds.cropBottom,
      cropLeft: autoBounds.cropLeft,
      cropRight: autoBounds.cropRight,
    };
  }, []);

  // Initialize first page when modal opens and auto-select Crop mode
  useEffect(() => {
    if (!isOpen || !imageFile) {
      setPages([]);
      setActiveIndex(0);
      setIsCropping(false);
      return;
    }

    let cancelled = false;
    loadFileAsPage(imageFile)
      .then((firstPage) => {
        if (!cancelled) {
          setPages([firstPage]);
          setActiveIndex(0);
          setIsCropping(true);
        }
      })
      .catch((err) => console.error("Failed to load initial scan page:", err));

    return () => {
      cancelled = true;
    };
  }, [isOpen, imageFile, loadFileAsPage]);

  const activePage = pages[activeIndex] || null;

  // Render active page preview (when isCropping=true, render uncropped image so user can drag crop box over it)
  useEffect(() => {
    if (!activePage || !canvasRef.current) return;
    renderPageToCanvas(activePage, canvasRef.current, 1600, isCropping);
  }, [activePage, isCropping]);

  const updateActivePage = useCallback(
    (updates: Partial<ScanPageConfig>) => {
      setPages((prev) =>
        prev.map((p, idx) => (idx === activeIndex ? { ...p, ...updates } : p))
      );
    },
    [activeIndex]
  );

  // Interactive Pointer Dragging for Crop Handles (Works on both Mobile Touch & Desktop Mouse)
  function startCropDrag(
    e: React.PointerEvent<HTMLElement>,
    handle: DragHandleType
  ) {
    if (!activePage) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // If user starts cropping from 0,0,0,0 and taps "Crop", give a slight default inset if untouched
    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startTop: activePage.cropTop,
      startBottom: activePage.cropBottom,
      startLeft: activePage.cropLeft,
      startRight: activePage.cropRight,
    };
  }

  function moveCropDrag(e: React.PointerEvent<HTMLElement>) {
    const drag = dragStateRef.current;
    const stage = cropStageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;

    const MIN_BOX_SIZE = 20; // minimum 20% width/height remaining

    let nextTop = drag.startTop;
    let nextBottom = drag.startBottom;
    let nextLeft = drag.startLeft;
    let nextRight = drag.startRight;

    const h = drag.handle;

    if (h === "tl" || h === "top" || h === "tr") {
      nextTop = Math.max(
        0,
        Math.min(100 - drag.startBottom - MIN_BOX_SIZE, drag.startTop + dyPct)
      );
    }
    if (h === "bl" || h === "bottom" || h === "br") {
      nextBottom = Math.max(
        0,
        Math.min(100 - drag.startTop - MIN_BOX_SIZE, drag.startBottom - dyPct)
      );
    }
    if (h === "tl" || h === "left" || h === "bl") {
      nextLeft = Math.max(
        0,
        Math.min(100 - drag.startRight - MIN_BOX_SIZE, drag.startLeft + dxPct)
      );
    }
    if (h === "tr" || h === "right" || h === "br") {
      nextRight = Math.max(
        0,
        Math.min(100 - drag.startLeft - MIN_BOX_SIZE, drag.startRight - dxPct)
      );
    }
    if (h === "move") {
      const boxW = 100 - drag.startLeft - drag.startRight;
      const boxH = 100 - drag.startTop - drag.startBottom;
      nextLeft = Math.max(0, Math.min(100 - boxW, drag.startLeft + dxPct));
      nextRight = 100 - boxW - nextLeft;
      nextTop = Math.max(0, Math.min(100 - boxH, drag.startTop + dyPct));
      nextBottom = 100 - boxH - nextTop;
    }

    updateActivePage({
      cropTop: Math.round(nextTop * 10) / 10,
      cropBottom: Math.round(nextBottom * 10) / 10,
      cropLeft: Math.round(nextLeft * 10) / 10,
      cropRight: Math.round(nextRight * 10) / 10,
    });
  }

  function endCropDrag() {
    dragStateRef.current = null;
  }

  function toggleCropMode() {
    if (!activePage) return;
    if (!isCropping) {
      // If crop is currently at 0% on all sides, inset slightly by 5% so the user immediately sees the draggable crop frame
      if (
        activePage.cropTop === 0 &&
        activePage.cropBottom === 0 &&
        activePage.cropLeft === 0 &&
        activePage.cropRight === 0
      ) {
        updateActivePage({
          cropTop: 5,
          cropBottom: 5,
          cropLeft: 5,
          cropRight: 5,
        });
      }
      setIsCropping(true);
    } else {
      setIsCropping(false);
    }
  }

  async function handleAddMorePageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const loadedPages: ScanPageConfig[] = [];

    for (const file of filesArray) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const page = await loadFileAsPage(file);
        loadedPages.push(page);
      } catch (err) {
        console.error("Failed to load additional page:", err);
      }
    }

    if (loadedPages.length > 0) {
      setPages((prev) => {
        const next = [...prev, ...loadedPages];
        setActiveIndex(next.length - 1);
        return next;
      });
      // Auto-select Crop mode whenever a new page photo is captured
      setIsCropping(true);
    }
  }

  function handleRemovePage(indexToRemove: number) {
    if (pages.length <= 1) return;
    setPages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      setActiveIndex((curr) => Math.min(curr, next.length - 1));
      return next;
    });
  }

  // Save all pages combined into a single PDF file
  async function handleSaveAsPdf() {
    if (pages.length === 0) return;
    setIsCropping(false);
    setSaving("pdf");

    try {
      const offscreenCanvas = document.createElement("canvas");
      const maxDim = pages.length > 5 ? 1250 : pages.length > 2 ? 1400 : 1600;
      const jpegQuality =
        pages.length > 5 ? 0.72 : pages.length > 2 ? 0.78 : 0.84;

      const pdfPages: ScannedPdfPage[] = [];

      for (const page of pages) {
        renderPageToCanvas(page, offscreenCanvas, maxDim, false);
        const blob = await new Promise<Blob | null>((resolve) =>
          offscreenCanvas.toBlob((b) => resolve(b), "image/jpeg", jpegQuality)
        );
        if (!blob) throw new Error("Failed to encode scanned page");

        const arrayBuffer = await blob.arrayBuffer();
        pdfPages.push({
          jpegBytes: new Uint8Array(arrayBuffer),
          width: offscreenCanvas.width,
          height: offscreenCanvas.height,
        });
      }

      const pdfBlob = generateMultiPagePdfBlob(pdfPages);
      const baseName = (documentLabel || "Scanned-Document")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_");
      const pdfFile = new File([pdfBlob], `${baseName}.pdf`, {
        type: "application/pdf",
      });

      await onSaveScan(pdfFile);
      onClose();
    } catch (err) {
      console.error("Save multi-page PDF error:", err);
    } finally {
      setSaving(null);
    }
  }

  // Optional: Save single active page as JPG
  async function handleSaveAsJpg() {
    if (!activePage) return;
    setIsCropping(false);
    setSaving("jpg");

    try {
      const offscreenCanvas = document.createElement("canvas");
      renderPageToCanvas(activePage, offscreenCanvas, 1600, false);

      const blob = await new Promise<Blob | null>((resolve) =>
        offscreenCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.86)
      );
      if (!blob) throw new Error("Failed to generate scanned image");

      const baseName = (documentLabel || "Scanned-Document")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_");
      const jpgFile = new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
      });

      await onSaveScan(jpgFile);
      onClose();
    } catch (err) {
      console.error("Save scan JPG error:", err);
    } finally {
      setSaving(null);
    }
  }

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4 text-[#ff595d]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold truncate">
              {documentLabel} — Scanner ({pages.length}{" "}
              {pages.length === 1 ? "Page" : "Pages"})
            </h3>
            <p className="text-[10.5px] text-slate-400">
              {isCropping
                ? "Drag corners or edges to crop document"
                : "Capture multiple pages & save as PDF"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving !== null}
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Close scanner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Multi-Page Strip & "+ Add Next Page" Camera Button */}
      <div className="px-3.5 py-2 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {pages.map((p, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={p.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCropping(false);
                    setActiveIndex(idx);
                  }}
                  className="focus:outline-none"
                >
                  Page {idx + 1}
                </button>
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePage(idx)}
                    className="ml-1 p-0.5 rounded hover:bg-black/25 text-white/80 hover:text-white"
                    title={`Remove Page ${idx + 1}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Hidden Camera Input to Capture Next Page */}
        <input
          ref={addPageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleAddMorePageFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => addPageInputRef.current?.click()}
          className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <Camera className="w-3.5 h-3.5" />
          <span>Add Page</span>
        </button>
      </div>

      {/* Main Canvas Preview & Interactive Touch Crop Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-slate-950 relative">
        {!activePage ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-medium">
              Processing camera image...
            </span>
          </div>
        ) : (
          <div
            ref={cropStageRef}
            className="relative inline-block max-w-full max-h-[54vh]"
          >
            <canvas
              ref={canvasRef}
              className="block max-w-full max-h-[54vh] w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/15 bg-white"
            />

            {/* Interactive Touch & Pointer Crop Box Overlay */}
            {isCropping && (
              <div className="absolute inset-0 touch-none">
                {/* Darkened masks outside the crop box */}
                <div
                  className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
                  style={{ height: `${activePage.cropTop}%` }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
                  style={{ height: `${activePage.cropBottom}%` }}
                />
                <div
                  className="absolute bg-black/60 pointer-events-none"
                  style={{
                    top: `${activePage.cropTop}%`,
                    bottom: `${activePage.cropBottom}%`,
                    left: 0,
                    width: `${activePage.cropLeft}%`,
                  }}
                />
                <div
                  className="absolute bg-black/60 pointer-events-none"
                  style={{
                    top: `${activePage.cropTop}%`,
                    bottom: `${activePage.cropBottom}%`,
                    right: 0,
                    width: `${activePage.cropRight}%`,
                  }}
                />

                {/* Active Crop Frame */}
                <div
                  onPointerDown={(e) => startCropDrag(e, "move")}
                  onPointerMove={moveCropDrag}
                  onPointerUp={endCropDrag}
                  onPointerCancel={endCropDrag}
                  className="absolute border-2 border-[#ff2d32] shadow-[0_0_0_1px_rgba(255,255,255,0.6)] cursor-move"
                  style={{
                    top: `${activePage.cropTop}%`,
                    bottom: `${activePage.cropBottom}%`,
                    left: `${activePage.cropLeft}%`,
                    right: `${activePage.cropRight}%`,
                  }}
                >
                  {/* 3x3 Rule of Thirds Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-white/30" />
                    <div className="border-r border-white/30" />
                    <div />
                  </div>

                  {/* 4 Corner Handles (Large touch targets for mobile fingers) */}
                  <div
                    onPointerDown={(e) => startCropDrag(e, "tl")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "tr")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "bl")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "br")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
                  </div>

                  {/* 4 Edge Midpoint Handles */}
                  <div
                    onPointerDown={(e) => startCropDrag(e, "top")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 flex items-center justify-center cursor-ns-resize"
                  >
                    <span className="w-6 h-1.5 rounded-full bg-white border border-primary shadow" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "bottom")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-6 flex items-center justify-center cursor-ns-resize"
                  >
                    <span className="w-6 h-1.5 rounded-full bg-white border border-primary shadow" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "left")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-10 flex items-center justify-center cursor-ew-resize"
                  >
                    <span className="w-1.5 h-6 rounded-full bg-white border border-primary shadow" />
                  </div>

                  <div
                    onPointerDown={(e) => startCropDrag(e, "right")}
                    onPointerMove={moveCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                    className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-10 flex items-center justify-center cursor-ew-resize"
                  >
                    <span className="w-1.5 h-6 rounded-full bg-white border border-primary shadow" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crop Mode Action Bar */}
      {isCropping && activePage && (
        <div className="px-4 py-3 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              updateActivePage({
                cropTop: 0,
                cropBottom: 0,
                cropLeft: 0,
                cropRight: 0,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Full Image (Reset)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCropping(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white shadow-md transition"
          >
            <Check className="w-4 h-4" />
            <span>Apply Crop</span>
          </button>
        </div>
      )}

      {/* Bottom Controls Bar */}
      {activePage && !isCropping && (
        <div className="p-3.5 bg-slate-900 border-t border-white/10 space-y-3">
          {/* Scan Clarity / Whitening Slider */}
          {activePage.filterMode !== "original" && (
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-300 whitespace-nowrap">
                Scan Clarity
              </span>
              <input
                type="range"
                min={5}
                max={85}
                value={activePage.contrastBoost}
                onChange={(e) =>
                  updateActivePage({ contrastBoost: Number(e.target.value) })
                }
                className="flex-1 accent-primary"
              />
            </div>
          )}

          {/* Filter Mode Pills + Crop + Rotate */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
            <div className="flex items-center gap-1.5">
              {[
                { id: "magic", label: "Magic Scan" },
                { id: "bw", label: "B&W Copy" },
                { id: "grayscale", label: "Grayscale" },
                { id: "original", label: "Original" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    updateActivePage({ filterMode: mode.id as ScanFilterMode })
                  }
                  className={`whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activePage.filterMode === mode.id
                      ? "bg-primary text-white shadow-sm shadow-primary/40"
                      : "bg-white/10 text-slate-300 hover:bg-white/15"
                  }`}
                >
                  {mode.id === "magic" && <Sparkles className="w-3 h-3" />}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleCropMode}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition"
                title="Crop document"
              >
                <Crop className="w-3.5 h-3.5 text-[#ff595d]" />
                <span>Crop</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateActivePage({
                    rotation: (activePage.rotation + 90) % 360,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate</span>
              </button>
            </div>
          </div>

          {/* Save Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              disabled={saving !== null}
              onClick={onClose}
              className="py-2.5 px-3.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition whitespace-nowrap"
            >
              Cancel
            </button>

            {pages.length === 1 && (
              <button
                type="button"
                disabled={saving !== null}
                onClick={handleSaveAsJpg}
                className="inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition whitespace-nowrap disabled:opacity-50"
              >
                {saving === "jpg" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>Save JPG</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving !== null}
              onClick={handleSaveAsPdf}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition whitespace-nowrap disabled:opacity-50"
            >
              {saving === "pdf" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>
                    Save as PDF ({pages.length}{" "}
                    {pages.length === 1 ? "Page" : "Pages"})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

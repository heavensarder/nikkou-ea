"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  Check,
  RotateCw,
  Sparkles,
  X,
  SlidersHorizontal,
  Loader2,
  Crop,
} from "lucide-react";

export type ScanFilterMode = "magic" | "bw" | "grayscale" | "original";

interface DocumentScannerModalProps {
  isOpen: boolean;
  imageFile: File | null;
  documentLabel: string;
  onClose: () => void;
  onSaveScan: (scannedFile: File) => Promise<void> | void;
}

export default function DocumentScannerModal({
  isOpen,
  imageFile,
  documentLabel,
  onClose,
  onSaveScan,
}: DocumentScannerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const [filterMode, setFilterMode] = useState<ScanFilterMode>("magic");
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [contrastBoost, setContrastBoost] = useState<number>(35); // 0..100
  const [showCropControls, setShowCropControls] = useState<boolean>(false);
  // Crop inset percentages (0..35%)
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [cropLeft, setCropLeft] = useState<number>(0);
  const [cropRight, setCropRight] = useState<number>(0);

  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Load captured image into an HTMLImageElement
  useEffect(() => {
    if (!isOpen || !imageFile) {
      setImageLoaded(false);
      return;
    }

    setFilterMode("magic");
    setRotation(0);
    setContrastBoost(35);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    setShowCropControls(false);

    const objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      sourceImageRef.current = img;
      setImageLoaded(true);
    };
    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, imageFile]);

  // Render scanned document to canvas whenever filter, rotation, contrast, or crop changes
  const renderScanPreview = useCallback(() => {
    const img = sourceImageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imageLoaded) return;

    // Limit max dimension to 1800px so processing is instant on mobile and output file is ~500KB - 1.5MB (well under 5MB)
    const MAX_DIM = 1800;
    const srcX = Math.round((cropLeft / 100) * img.width);
    const srcY = Math.round((cropTop / 100) * img.height);
    const srcW = Math.max(
      50,
      Math.round(((100 - cropLeft - cropRight) / 100) * img.width)
    );
    const srcH = Math.max(
      50,
      Math.round(((100 - cropTop - cropBottom) / 100) * img.height)
    );

    const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);

    const isRotated90 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90 ? drawH : drawW;
    canvas.height = isRotated90 ? drawW : drawH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    ctx.restore();

    if (filterMode === "original") return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // CamScanner-style pixel processing
    // contrastBoost (0..100) controls background whitening & ink darkening
    const whiteThreshold = 205 - Math.round((contrastBoost / 100) * 45); // ~160..205
    const darkFloor = 45 + Math.round((contrastBoost / 100) * 35); // ~45..80
    const range = Math.max(1, whiteThreshold - darkFloor);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Perceived luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filterMode === "magic") {
        // Magic Color: whiten paper shadows while preserving colored stamps/signatures & darkening text
        if (lum >= whiteThreshold) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          // Stretch contrast curve & boost color saturation slightly
          const norm = Math.max(0, (lum - darkFloor) / range);
          const targetLum = Math.pow(norm, 0.85) * 255;
          const ratio = lum > 1 ? targetLum / lum : 0;

          // Saturation boost for stamps/seals
          const avg = (r + g + b) / 3;
          const satR = avg + (r - avg) * 1.25;
          const satG = avg + (g - avg) * 1.25;
          const satB = avg + (b - avg) * 1.25;

          data[i] = Math.min(255, Math.max(0, Math.round(satR * ratio)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(satG * ratio)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(satB * ratio)));
        }
      } else if (filterMode === "bw") {
        // High-contrast Black & White Document Scan
        const bwCutoff = 145 - Math.round(((contrastBoost - 35) / 100) * 40);
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
      } else if (filterMode === "grayscale") {
        // Clean Grayscale Scanner
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
  }, [
    imageLoaded,
    filterMode,
    rotation,
    contrastBoost,
    cropTop,
    cropBottom,
    cropLeft,
    cropRight,
  ]);

  useEffect(() => {
    renderScanPreview();
  }, [renderScanPreview]);

  async function handleConfirmSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88)
      );
      if (!blob) throw new Error("Failed to generate scanned document");

      const baseName = (documentLabel || "Scanned-Document")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_");
      const scannedFile = new File([blob], `${baseName}-Scan.jpg`, {
        type: "image/jpeg",
      });

      await onSaveScan(scannedFile);
      onClose();
    } catch (err) {
      console.error("Save scan error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4 text-[#ff595d]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">
              Document Scanner — {documentLabel}
            </h3>
            <p className="text-[11px] text-slate-400">
              Auto-enhanced scan copy
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Close scanner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Canvas Preview Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-slate-950 relative">
        {!imageLoaded ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-medium">
              Processing camera image...
            </span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[56vh] object-contain rounded-lg shadow-2xl border border-white/15 bg-white"
          />
        )}
      </div>

      {/* Optional Trim / Crop Edges Drawer */}
      {showCropControls && (
        <div className="px-4 py-3 bg-slate-900/95 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Trim Outer Edges (Remove table/background border)</span>
            <button
              type="button"
              onClick={() => {
                setCropTop(0);
                setCropBottom(0);
                setCropLeft(0);
                setCropRight(0);
              }}
              className="text-[11px] text-primary hover:underline"
            >
              Reset Trim
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
            <div>
              <label className="flex justify-between mb-1">
                <span>Top Edge</span>
                <span>{cropTop}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={35}
                value={cropTop}
                onChange={(e) => setCropTop(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="flex justify-between mb-1">
                <span>Bottom Edge</span>
                <span>{cropBottom}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={35}
                value={cropBottom}
                onChange={(e) => setCropBottom(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="flex justify-between mb-1">
                <span>Left Edge</span>
                <span>{cropLeft}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={35}
                value={cropLeft}
                onChange={(e) => setCropLeft(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="flex justify-between mb-1">
                <span>Right Edge</span>
                <span>{cropRight}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={35}
                value={cropRight}
                onChange={(e) => setCropRight(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="p-4 bg-slate-900 border-t border-white/10 space-y-3.5">
        {/* Scan Clarity / Whitening Slider */}
        {filterMode !== "original" && (
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-300 whitespace-nowrap">
              Scan Clarity
            </span>
            <input
              type="range"
              min={5}
              max={85}
              value={contrastBoost}
              onChange={(e) => setContrastBoost(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>
        )}

        {/* Filter Mode Pills + Rotate + Trim */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
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
                onClick={() => setFilterMode(mode.id as ScanFilterMode)}
                className={`whitespace-nowrap inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterMode === mode.id
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
              onClick={() => setShowCropControls((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                showCropControls
                  ? "bg-secondary text-white"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
              title="Trim edges"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Trim</span>
            </button>

            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving || !imageLoaded}
            onClick={handleConfirmSave}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Scan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Use Scanned Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

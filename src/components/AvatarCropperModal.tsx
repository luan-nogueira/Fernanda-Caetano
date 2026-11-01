"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  Move,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirmCrop: (croppedDataUrl: string) => Promise<void> | void;
}

export function AvatarCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirmCrop,
}: AvatarCropperModalProps) {
  const CROP_SIZE = 260; // Tamanho do círculo visível na tela (px)
  const OUTPUT_SIZE = 512; // Resolução final salva (512x512 px)

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImgLoaded(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({
        width: img.naturalWidth || 500,
        height: img.naturalHeight || 500,
      });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Escala base para que o menor lado da imagem preencha o círculo CROP_SIZE
  const baseScale =
    CROP_SIZE / Math.min(naturalSize.width || 1, naturalSize.height || 1);
  const currentScale = baseScale * zoom;

  const renderedWidth = naturalSize.width * currentScale;
  const renderedHeight = naturalSize.height * currentScale;

  // Limita o arraste para a foto nunca deixar bordas vazias dentro do círculo
  function clampOffset(nextX: number, nextY: number, targetZoom = zoom) {
    const scale = baseScale * targetZoom;
    const w = naturalSize.width * scale;
    const h = naturalSize.height * scale;
    const maxX = Math.max(0, (w - CROP_SIZE) / 2);
    const maxY = Math.max(0, (h - CROP_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset(
      clampOffset(
        dragStartRef.current.startOffsetX + dx,
        dragStartRef.current.startOffsetY + dy
      )
    );
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
  }

  function handleZoomChange(nextZoom: number) {
    const clampedZoom = Math.min(3.5, Math.max(1, nextZoom));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  }

  async function handleSaveCroppedImage() {
    if (!imgRef.current) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fundo marinho caso a imagem tenha transparência
      ctx.fillStyle = "#07152B";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const ratio = OUTPUT_SIZE / CROP_SIZE;
      const drawW = renderedWidth * ratio;
      const drawH = renderedHeight * ratio;
      const drawX = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
      const drawY = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      await onConfirmCrop(dataUrl);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-2 border-gold/40 shadow-luxury flex flex-col">
        {/* Topo estilo WhatsApp */}
        <div className="bg-navy text-white px-5 py-4 flex items-center justify-between border-b border-gold/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-gold flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-white leading-none">
                Ajustar Foto de Perfil
              </h3>
              <span className="text-[11px] text-gold-light">
                Arraste e dê zoom para enquadrar (Estilo WhatsApp)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área de Recorte Circular Interativa */}
        <div className="p-6 bg-navy-950 flex flex-col items-center justify-center relative">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.1 : -0.1;
              handleZoomChange(zoom + delta);
            }}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            className="relative rounded-full overflow-hidden border-4 border-gold shadow-[0_0_0_9999px_rgba(7,21,43,0.78)] cursor-grab active:cursor-grabbing touch-none flex items-center justify-center bg-navy"
          >
            {imgLoaded && (
              <img
                src={imageSrc}
                alt="Recorte de Perfil"
                draggable={false}
                style={{
                  width: `${renderedWidth}px`,
                  height: `${renderedHeight}px`,
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                  maxWidth: "none",
                }}
                className="pointer-events-none select-none object-cover"
              />
            )}

            {/* Grade sutil de enquadramento estilo WhatsApp */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35">
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-white/40" />
              <div className="border-r border-white/40" />
              <div />
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gold-light text-[11px] font-medium z-10">
            <Move className="w-3.5 h-3.5" />
            <span>Arraste a imagem com o mouse ou dedo para centralizar</span>
          </div>
        </div>

        {/* Controles de Zoom e Confirmação */}
        <div className="p-5 bg-white space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              className="p-2 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy border border-offwhite-border"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={1}
              max={3.5}
              step={0.02}
              value={zoom}
              onChange={(e) => handleZoomChange( parseFloat(e.target.value) )}
              className="flex-1 accent-terracotta cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              className="p-2 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy border border-offwhite-border"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="p-2 rounded-xl bg-offwhite hover:bg-offwhite-warm text-slate hover:text-navy border border-offwhite-border"
              title="Resetar posição e zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-offwhite-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCroppedImage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando foto...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Recortar e Salvar Foto de Perfil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


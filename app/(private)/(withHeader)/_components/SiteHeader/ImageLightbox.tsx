"use client";

import * as React from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/** One button press or wheel notch, as a factor rather than a step, so the
 *  jump feels the same at 1× as it does at 4×. */
const ZOOM_FACTOR = 1.25;
/** What a double-click zooms to — enough to read small print in one gesture. */
const DOUBLE_CLICK_ZOOM = 2.5;

type Offset = { x: number; y: number };

const NO_OFFSET: Offset = { x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Opens an image full-screen with zoom and pan.
 *
 * `children` is the trigger — the thumbnail as it sits in its own layout — so
 * the caller keeps control of how the small version looks.
 *
 * The image is scaled with a CSS transform rather than by swapping in a larger
 * source: there is only ever one file, and reading it at 4× is a matter of
 * magnifying what was downloaded, not of fetching more pixels.
 */
export function ImageLightbox({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const [offset, setOffset] = React.useState<Offset>(NO_OFFSET);
  const [panning, setPanning] = React.useState(false);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const panStart = React.useRef({ pointerX: 0, pointerY: 0, ...NO_OFFSET });

  const reset = React.useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset(NO_OFFSET);
  }, []);

  /**
   * Keeps the image overlapping its viewport: panning stops where the scaled
   * edge meets the frame, so the picture can never be dragged out of sight.
   */
  const clampOffset = React.useCallback((next: Offset, atZoom: number) => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image) return next;

    // offsetWidth/Height are the laid-out (object-contain) size, before the
    // transform — the scaled size is that times the zoom.
    const maxX = Math.max(
      0,
      (image.offsetWidth * atZoom - viewport.clientWidth) / 2,
    );
    const maxY = Math.max(
      0,
      (image.offsetHeight * atZoom - viewport.clientHeight) / 2,
    );

    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, []);

  /**
   * Zooms so the point under (viewportX, viewportY) — measured from the centre
   * — stays put. Passing 0,0 zooms about the middle, which is what the buttons
   * want; the wheel passes the cursor, so the image grows where you're looking.
   */
  const zoomTo = React.useCallback(
    (nextZoom: number, viewportX = 0, viewportY = 0) => {
      const target = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (target === zoom) return;

      setZoom(target);

      if (target === MIN_ZOOM) {
        setOffset(NO_OFFSET);
        return;
      }

      // The image-space point under the cursor, re-anchored at the new zoom.
      const imageX = (viewportX - offset.x) / zoom;
      const imageY = (viewportY - offset.y) / zoom;

      setOffset(
        clampOffset(
          { x: viewportX - imageX * target, y: viewportY - imageY * target },
          target,
        ),
      );
    },
    [clampOffset, offset, zoom],
  );

  // React routes wheel through a passive listener at the root, where
  // preventDefault is ignored, so the zoom listener is attached directly.
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!open || !viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomTo(
        zoom * (event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR),
        event.clientX - rect.left - rect.width / 2,
        event.clientY - rect.top - rect.height / 2,
      );
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [open, zoom, zoomTo]);

  const startPan = (event: React.PointerEvent) => {
    if (zoom === MIN_ZOOM) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      ...offset,
    };
    setPanning(true);
  };

  const pan = (event: React.PointerEvent) => {
    if (!panning) return;
    const start = panStart.current;
    setOffset(
      clampOffset(
        {
          x: start.x + (event.clientX - start.pointerX),
          y: start.y + (event.clientY - start.pointerY),
        },
        zoom,
      ),
    );
  };

  const endPan = (event: React.PointerEvent) => {
    if (!panning) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  };

  const toggleZoom = (event: React.MouseEvent) => {
    if (zoom > MIN_ZOOM) {
      reset();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    zoomTo(
      DOUBLE_CLICK_ZOOM,
      event.clientX - rect.left - rect.width / 2,
      event.clientY - rect.top - rect.height / 2,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Each opening starts fit-to-screen rather than wherever the last one
        // was left.
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
        // The image is the content, so the frame stays out of its way; the
        // title below carries the accessible name.
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Scroll or use the zoom buttons to magnify, drag to move around.
        </DialogDescription>

        <div
          ref={viewportRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/40 touch-none"
          onPointerDown={startPan}
          onPointerMove={pan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onDoubleClick={toggleZoom}
          style={{
            cursor:
              zoom === MIN_ZOOM ? "zoom-in" : panning ? "grabbing" : "grab",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              // Animating the drag would lag the pointer; only the discrete
              // jumps from the buttons and the wheel are eased.
              transition: panning ? "none" : "transform 120ms ease-out",
            }}
          />
        </div>

        {/* Outside the pan surface, not floating within it: panning captures the
            pointer, and a captured pointer delivers its click to the capture
            target — so a button nested in there would stop responding the
            moment the image was zoomed. */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/90 px-2 py-1 shadow-lg backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => zoomTo(zoom / ZOOM_FACTOR)}
          >
            <Minus />
          </Button>
          <span className="min-w-14 text-center text-sm tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => zoomTo(zoom * ZOOM_FACTOR)}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reset zoom"
            disabled={zoom === MIN_ZOOM && offset.x === 0 && offset.y === 0}
            onClick={reset}
          >
            <RotateCcw />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

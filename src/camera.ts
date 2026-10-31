// Camera maths as plain functions, separate from Phaser so they can be unit tested.
// All screen values are in game pixels (device pixels); world values are in grid pixels.

import { CAMERA, GRID } from './config';

export interface Viewport {
  width: number;
  height: number;
}

/** Parts of the screen covered by the HTML overlay (e.g. the top bar). */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** What the camera shows: a zoom level and the world point at the centre of the screen. */
export interface View {
  zoom: number;
  midX: number;
  midY: number;
}

export interface ZoomLimits {
  min: number;
  max: number;
}

export interface Point {
  x: number;
  y: number;
}

export const PLOT_WIDTH = GRID.cols * GRID.squareSize;
export const PLOT_HEIGHT = GRID.rows * GRID.squareSize;

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Most zoomed out: the whole plot fits. Most zoomed in: about 6 squares fill the screen height. */
export function zoomLimits(viewport: Viewport, insets: Insets, margin: number): ZoomLimits {
  const usableWidth = viewport.width - insets.left - insets.right - margin * 2;
  const usableHeight = viewport.height - insets.top - insets.bottom - margin * 2;
  const min = Math.max(Math.min(usableWidth / PLOT_WIDTH, usableHeight / PLOT_HEIGHT), Number.EPSILON);
  const max = viewport.height / (CAMERA.minVisibleRows * GRID.squareSize);
  return { min, max: Math.max(min, max) };
}

export function clampZoom(zoom: number, limits: ZoomLimits): number {
  return Math.min(Math.max(zoom, limits.min), limits.max);
}

export function screenToWorld(view: View, viewport: Viewport, screen: Point): Point {
  return {
    x: view.midX + (screen.x - viewport.width / 2) / view.zoom,
    y: view.midY + (screen.y - viewport.height / 2) / view.zoom,
  };
}

/** Changes the zoom while keeping the world point under `focus` in the same place on screen. */
export function zoomAt(view: View, viewport: Viewport, zoom: number, focus: Point): View {
  const world = screenToWorld(view, viewport, focus);
  return {
    zoom,
    midX: world.x - (focus.x - viewport.width / 2) / zoom,
    midY: world.y - (focus.y - viewport.height / 2) / zoom,
  };
}

/** Moves the view so the world follows a finger that moved by (dx, dy) screen pixels. */
export function pan(view: View, dx: number, dy: number): View {
  return { zoom: view.zoom, midX: view.midX - dx / view.zoom, midY: view.midY - dy / view.zoom };
}

/** A wheel event's scroll amount in pixels. Some mice and browsers report lines or pages instead. */
export function wheelPixels(delta: number, deltaMode: number): number {
  const LINE = 1;
  const PAGE = 2;
  return deltaMode === LINE ? delta * 16 : deltaMode === PAGE ? delta * 100 : delta;
}

/**
 * How much one pinch event zooms: above 1 zooms in, below 1 zooms out. A trackpad pinch arrives as
 * lots of small ctrl + wheel events. The same event from ctrl + a mouse wheel is one big step, so it
 * is capped to a gentle jump (about 35% for one notch).
 */
export function pinchZoomFactor(deltaY: number, deltaMode: number): number {
  const capped = Math.min(Math.max(wheelPixels(deltaY, deltaMode), -30), 30);
  return Math.exp(-capped * 0.01);
}

/** The centre of the screen area not covered by the overlay. */
export function usableCentre(viewport: Viewport, insets: Insets): Point {
  return {
    x: insets.left + (viewport.width - insets.left - insets.right) / 2,
    y: insets.top + (viewport.height - insets.top - insets.bottom) / 2,
  };
}

/** Whole plot on screen, centred in the area not covered by the overlay. */
export function fitView(viewport: Viewport, insets: Insets, margin: number): View {
  const zoom = zoomLimits(viewport, insets, margin).min;
  const centre = usableCentre(viewport, insets);
  return {
    zoom,
    midX: PLOT_WIDTH / 2 - (centre.x - viewport.width / 2) / zoom,
    midY: PLOT_HEIGHT / 2 - (centre.y - viewport.height / 2) / zoom,
  };
}

/**
 * Keeps the zoom within its limits and the plot on screen. If the plot is
 * smaller than the visible area along an axis, it is centred on that axis.
 */
export function clampView(view: View, viewport: Viewport, insets: Insets, margin: number): View {
  const zoom = clampZoom(view.zoom, zoomLimits(viewport, insets, margin));
  return {
    zoom,
    midX: clampAxis(view.midX, zoom, viewport.width, insets.left, insets.right, PLOT_WIDTH, margin),
    midY: clampAxis(view.midY, zoom, viewport.height, insets.top, insets.bottom, PLOT_HEIGHT, margin),
  };
}

function clampAxis(
  mid: number,
  zoom: number,
  screenSize: number,
  insetStart: number,
  insetEnd: number,
  plotSize: number,
  margin: number,
): number {
  // World coordinates of the visible area's edges, relative to `mid`.
  const startOffset = (insetStart - screenSize / 2) / zoom;
  const endOffset = (screenSize - insetEnd - screenSize / 2) / zoom;
  const visible = endOffset - startOffset;
  const slack = margin / zoom;

  if (visible >= plotSize + slack * 2) {
    return plotSize / 2 - (startOffset + endOffset) / 2;
  }
  const minMid = -slack - startOffset;
  const maxMid = plotSize + slack - endOffset;
  return Math.min(Math.max(mid, minMid), maxMid);
}

/** In-between view for animations: zoom changes evenly in ratio, position in a straight line. */
export function lerpView(from: View, to: View, t: number): View {
  return {
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, t),
    midX: from.midX + (to.midX - from.midX) * t,
    midY: from.midY + (to.midY - from.midY) * t,
  };
}

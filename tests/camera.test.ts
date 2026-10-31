import { describe, expect, it } from 'vitest';
import {
  clampView,
  clampZoom,
  fitView,
  NO_INSETS,
  pan,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  screenToWorld,
  pinchZoomFactor,
  wheelPixels,
  zoomAt,
  zoomLimits,
  type Insets,
  type View,
  type Viewport,
} from '../src/camera';
import { CAMERA, GRID } from '../src/config';

// A base iPad in landscape at 2× pixels, with a 64 px (×2) top bar.
const ipad: Viewport = { width: 2160, height: 1620 };
const topBar: Insets = { top: 128, right: 0, bottom: 0, left: 0 };
const margin = 32;

describe('zoom limits', () => {
  it('fits the whole plot at minimum zoom', () => {
    const { min } = zoomLimits(ipad, topBar, margin);
    const usableWidth = ipad.width - margin * 2;
    const usableHeight = ipad.height - topBar.top - margin * 2;
    expect(PLOT_WIDTH * min).toBeLessThanOrEqual(usableWidth + 1e-9);
    expect(PLOT_HEIGHT * min).toBeLessThanOrEqual(usableHeight + 1e-9);
    // ...and touches at least one side, so it is as big as it can be.
    expect(
      Math.abs(PLOT_WIDTH * min - usableWidth) < 1e-9 || Math.abs(PLOT_HEIGHT * min - usableHeight) < 1e-9,
    ).toBe(true);
  });

  it('shows about 6 squares in the screen height at maximum zoom', () => {
    const { max } = zoomLimits(ipad, topBar, margin);
    expect(ipad.height / (GRID.squareSize * max)).toBeCloseTo(CAMERA.minVisibleRows);
  });

  it('never has a maximum below the minimum on a tiny screen', () => {
    const { min, max } = zoomLimits({ width: 4000, height: 300 }, NO_INSETS, 0);
    expect(max).toBeGreaterThanOrEqual(min);
  });

  it('keeps zoom between the limits', () => {
    const limits = zoomLimits(ipad, topBar, margin);
    expect(clampZoom(0.01, limits)).toBe(limits.min);
    expect(clampZoom(100, limits)).toBe(limits.max);
    const middle = (limits.min + limits.max) / 2;
    expect(clampZoom(middle, limits)).toBe(middle);
  });
});

describe('zooming and panning', () => {
  it('keeps the point under the fingers in place while zooming', () => {
    const view: View = { zoom: 1, midX: 700, midY: 500 };
    const focus = { x: 400, y: 300 };
    const before = screenToWorld(view, ipad, focus);
    const after = screenToWorld(zoomAt(view, ipad, 2.5, focus), ipad, focus);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('moves the world with the fingers', () => {
    const view: View = { zoom: 2, midX: 700, midY: 500 };
    const moved = pan(view, 100, -40);
    expect(moved).toEqual({ zoom: 2, midX: 650, midY: 520 });
  });
});

describe('trackpad pinch zoom', () => {
  it('pinching out zooms in and pinching in zooms out', () => {
    expect(pinchZoomFactor(-5, 0)).toBeGreaterThan(1);
    expect(pinchZoomFactor(5, 0)).toBeLessThan(1);
    expect(pinchZoomFactor(0, 0)).toBe(1);
  });

  it('a small pinch event zooms a little', () => {
    expect(pinchZoomFactor(-5, 0)).toBeCloseTo(1.05, 1);
  });

  it('opening then closing by the same amount comes back to the same zoom', () => {
    expect(pinchZoomFactor(-8, 0) * pinchZoomFactor(8, 0)).toBeCloseTo(1, 10);
  });

  it('does not jump the whole way on one huge event (ctrl + a mouse wheel notch)', () => {
    expect(pinchZoomFactor(-5000, 0)).toBeCloseTo(pinchZoomFactor(-30, 0), 10);
    expect(pinchZoomFactor(-100, 0)).toBeLessThan(1.4);
  });
});

describe('wheel scroll amounts', () => {
  it('is the same number of pixels when the browser reports pixels', () => {
    expect(wheelPixels(40, 0)).toBe(40);
  });

  it('turns lines and pages into pixels', () => {
    expect(wheelPixels(3, 1)).toBe(48);
    expect(wheelPixels(1, 2)).toBe(100);
  });
});
describe('keeping the plot on screen', () => {
  it('centres the whole plot in the area below the top bar when fitted', () => {
    const view = fitView(ipad, topBar, margin);
    const topLeft = { x: (0 - view.midX) * view.zoom + ipad.width / 2, y: (0 - view.midY) * view.zoom + ipad.height / 2 };
    const right = ipad.width - (topLeft.x + PLOT_WIDTH * view.zoom);
    const bottom = ipad.height - (topLeft.y + PLOT_HEIGHT * view.zoom);
    expect(topLeft.x).toBeCloseTo(right);
    expect(topLeft.y - topBar.top).toBeCloseTo(bottom);
  });

  it('cannot drag the plot off screen', () => {
    const zoom = 2;
    const far: View = { zoom, midX: 99999, midY: -99999 };
    const view = clampView(far, ipad, topBar, margin);
    // Right edge of the plot is no further left than the right edge of the screen (minus margin).
    const plotRightOnScreen = (PLOT_WIDTH - view.midX) * zoom + ipad.width / 2;
    expect(plotRightOnScreen).toBeCloseTo(ipad.width - margin);
    // Top edge of the plot is no lower than just below the top bar.
    const plotTopOnScreen = (0 - view.midY) * zoom + ipad.height / 2;
    expect(plotTopOnScreen).toBeCloseTo(topBar.top + margin);
  });

  it('centres the plot on an axis where it is smaller than the screen', () => {
    const wide: Viewport = { width: 4000, height: 1620 };
    const view = clampView({ zoom: 1, midX: 0, midY: 0 }, wide, NO_INSETS, margin);
    expect(view.midX).toBeCloseTo(PLOT_WIDTH / 2);
  });

  it('pulls the zoom back inside the limits', () => {
    const limits = zoomLimits(ipad, topBar, margin);
    expect(clampView({ zoom: 50, midX: 700, midY: 500 }, ipad, topBar, margin).zoom).toBe(limits.max);
    expect(clampView({ zoom: 0.001, midX: 700, midY: 500 }, ipad, topBar, margin).zoom).toBe(limits.min);
  });
});

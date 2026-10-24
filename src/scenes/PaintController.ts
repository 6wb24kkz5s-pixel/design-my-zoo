import Phaser from 'phaser';
import { featureCatalogue } from '../data/content';
import { lineSquares, paintSquares, type PaintTool } from '../logic/paint';
import type { Square, Zoo } from '../logic/zoo';
import { pointerToSquare } from './pointer';

export interface PaintHost {
  /** The active paint tool, or null in normal drag mode. */
  tool(): PaintTool | null;
  zoo(): Zoo;
  /** Shows a stroke in progress without saving it. null goes back to the saved zoo. */
  showDraft(draft: Zoo | null): void;
  commit(next: Zoo): void;
}

interface Stroke {
  pointerId: number;
  base: Zoo;
  draft: Zoo;
  last: Square;
}

/**
 * Paint mode: one finger drags across squares to paint them. The whole stroke
 * is one Undo step. A second finger cancels the stroke, so pinching never
 * leaves stray paint.
 */
export class PaintController {
  private stroke: Stroke | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: PaintHost,
  ) {
    window.addEventListener('pointerdown', this.onAnyPointerDown, { capture: true });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    scene.game.canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
  }

  /** Drops the stroke in progress without saving it (e.g. before Undo). */
  cancel(): void {
    if (!this.stroke) return;
    this.stroke = null;
    this.host.showDraft(null);
  }

  private readonly onAnyPointerDown = (event: PointerEvent): void => {
    if (this.stroke && event.pointerId !== this.stroke.pointerId) this.cancel();
  };

  private readonly onCanvasPointerDown = (event: PointerEvent): void => {
    const tool = this.host.tool();
    if (!tool || this.stroke || !event.isPrimary) return;
    event.preventDefault();
    const square = pointerToSquare(this.scene, event);
    const base = this.host.zoo();
    const draft = paintSquares(base, featureCatalogue, tool, [square]);
    this.stroke = { pointerId: event.pointerId, base, draft, last: square };
    this.host.showDraft(draft);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const stroke = this.stroke;
    const tool = this.host.tool();
    if (!stroke || !tool || event.pointerId !== stroke.pointerId) return;
    const square = pointerToSquare(this.scene, event);
    if (square.col === stroke.last.col && square.row === stroke.last.row) return;
    stroke.draft = paintSquares(stroke.draft, featureCatalogue, tool, lineSquares(stroke.last, square));
    stroke.last = square;
    this.host.showDraft(stroke.draft);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const stroke = this.stroke;
    if (!stroke || event.pointerId !== stroke.pointerId) return;
    this.stroke = null;
    this.host.showDraft(null);
    if (stroke.draft !== stroke.base) this.host.commit(stroke.draft);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.stroke?.pointerId === event.pointerId) this.cancel();
  };
}

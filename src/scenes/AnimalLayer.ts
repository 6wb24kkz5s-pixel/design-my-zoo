import Phaser from 'phaser';
import { iconScale, NAME_TAG_MIN_SQUARE_PX, usesIcon } from '../art/lod';
import { spriteName } from '../art/names';
import { ART_KEY } from '../art/phaser';
import { ANIMAL_STYLE, BEHAVIOUR, EMOTE, GRID, ITEM_STYLE } from '../config';
import { BUBBLES, featureCatalogue, getAnimal, type Animal, type Message } from '../data/content';
import { needsWater } from '../logic/animals';
import { findPath, fits, peekPlan, rectKeys, strollOptions, swimSquares, type Cell } from '../logic/behaviour';
import { areaInfo, gapView } from '../logic/enclosures';
import { squareKey, type Size, type Square, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { createBubbleText, createLabel } from './labels';

/** One thing an animal is doing: walking somewhere, taking a single step (into or out of a gap), or looking about. */
type Action =
  | { kind: 'goto'; cell: Cell }
  | { kind: 'hop'; cell: Cell }
  | { kind: 'hold'; ms: number; bubble: boolean };

interface Area {
  /** The squares the animal may be on while it moves about. */
  allowed: Set<string>;
  /** Small gaps in its fence, if it is nearly fenced in. */
  gaps: Square[] | null;
}

interface AnimalView {
  /** Sits at the middle of the animal, so scaling it for a zoomed-out icon keeps it in place. */
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Container;
  picture: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  /** "I can get out here!", shown while the animal looks out of a gap. */
  escapeBubble: Phaser.GameObjects.Container;
  /** A small ❤️ that shows while the animal is happy. */
  badge: Phaser.GameObjects.Text;
  /** The animal's name, shown only when the plot is zoomed in enough to read it. */
  nameTag: Phaser.GameObjects.Text;
  id: string;
  size: Size;
  width: number;
  height: number;
  smallestSide: number;
  swims: boolean;
  hasPose: boolean;
  icon: boolean;
  /** Where the animal was put. This is its real, saved position; it never changes while it wanders. */
  home: Cell;
  /** The square it is standing on now (or about to), and where it is drawn, in world pixels. */
  cell: Cell;
  pos: { x: number; y: number };
  queue: Action[];
  action: Action | null;
  steps: Cell[];
  step: { from: { x: number; y: number }; to: { x: number; y: number }; cell: Cell; t: number; ms: number } | null;
  holdLeft: number;
  rest: number;
  nextPeek: number;
  facing: 1 | -1;
  held: boolean;
  area: ({ zoo: Zoo } & Area) | null;
}

/** How happy an animal is, as far as the plot needs to know. */
export interface Mood {
  /** How many of its five hearts are full. */
  count: number;
  happy: boolean;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Draws the animals from their pictures and brings them to life: they bob, stroll about inside their own
 * area, fish swim in their pool, birds and insects flap, and an animal whose fence has a gap goes to look
 * out of it. A fish that is not in water gets a 💧 speech bubble, a happy animal gets a ❤️ badge, and an emote
 * floats up when something changes its hearts. Zoomed out, animals grow into bold icons; zoomed in,
 * a small name tag appears under each one.
 *
 * Moving about is only for show. The animal's saved position, hearts and enclosure checks all use the
 * square it was put on.
 */
export class AnimalLayer {
  private readonly views = new Map<string, AnimalView>();
  private readonly hearts = new Map<string, number>();
  private readonly reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private created = 0;
  private squarePx: number = GRID.squareSize;
  private clock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Called when an animal has just become happy. */
    private readonly onBecameHappy: () => void = () => undefined,
  ) {}

  /** Updates every animal. `movingId` is the one being dragged: it is held still and drawn faded. */
  render(zoo: Zoo, movingId?: string): void {
    const present = new Set<string>();
    for (const animal of zoo.animals) {
      const info = getAnimal(animal.animalId);
      if (!info) continue;
      present.add(animal.animalId);

      const view = this.views.get(animal.animalId) ?? this.create(info, animal);
      if (view.home.col !== animal.col || view.home.row !== animal.row) {
        view.home = { col: animal.col, row: animal.row };
        this.snapHome(view);
      }
      view.held = animal.animalId === movingId;
      view.container.setAlpha(view.held ? ITEM_STYLE.movingAlpha : 1);
      view.bubble.setVisible(needsWater(zoo, featureCatalogue, animal));
      this.place(view);
    }

    for (const [id, view] of this.views) {
      if (present.has(id)) continue;
      view.container.destroy();
      this.views.delete(id);
      this.hearts.delete(id);
    }
  }

  /** Moves the animals along. Call once a frame with the saved zoo and the time since the last frame. */
  update(zoo: Zoo, delta: number): void {
    this.clock += delta;
    for (const view of this.views.values()) {
      if (!this.reduceMotion && !view.held) {
        this.advance(view, zoo, delta);
        this.animate(view);
      }
      this.place(view);
    }
  }

  /** The animal drawn at this point of the plot, if any (the one on top wins). Animals are found where they appear. */
  idAtPoint(x: number, y: number): string | null {
    let found: string | null = null;
    for (const view of this.views.values()) {
      if (x >= view.pos.x && x < view.pos.x + view.width && y >= view.pos.y && y < view.pos.y + view.height) found = view.id;
    }
    return found;
  }

  /** The top-left corner of where an animal is drawn, in world pixels. */
  positionOf(animalId: string): { x: number; y: number } | null {
    const view = this.views.get(animalId);
    return view ? { ...view.pos } : null;
  }

  /** The plot was zoomed: animals grow into bold icons when tiny, and show their names when big. */
  setSquarePx(squarePx: number): void {
    this.squarePx = squarePx;
    for (const view of this.views.values()) this.applyZoom(view);
  }

  private applyZoom(view: AnimalView): void {
    const scale = iconScale(this.squarePx, view.smallestSide);
    view.container.setScale(scale);
    view.icon = usesIcon(scale);
    view.picture.setFrame(this.frameFor(view, false));
    view.nameTag.setVisible(this.squarePx >= NAME_TAG_MIN_SQUARE_PX);
  }

  private frameFor(view: AnimalView, posed: boolean): string {
    const name = posed && view.hasPose ? spriteName.animalPose(view.id) : spriteName.animal(view.id);
    return view.icon ? spriteName.icon(name) : name;
  }

  /**
   * Shows who is happy, and floats an emote above an animal whose hearts just changed:
   * 😊 for a heart gained, 😟 for one lost, 🥰 when it has just become happy. The first
   * time an animal is seen (when the game loads, or it is added) nothing floats.
   */
  setMoods(moods: ReadonlyMap<string, Mood>): void {
    for (const [id, view] of this.views) {
      const mood = moods.get(id);
      if (!mood) continue;
      view.badge.setVisible(mood.happy);

      const before = this.hearts.get(id);
      if (before !== undefined && before !== mood.count) {
        this.emote(view, mood.happy ? EMOTE.becameHappy : mood.count > before ? EMOTE.gain : EMOTE.lose);
        if (mood.happy) this.onBecameHappy();
      }
      this.hearts.set(id, mood.count);
    }
  }

  private emote(view: AnimalView, face: string): void {
    const x = view.container.x;
    const y = view.container.y - view.height / 2 - 6;
    const text = createBubbleText(this.scene, face, EMOTE.fontSize, '#1e2a30').setPosition(x, y).setDepth(DEPTH.animals + 0.5);
    this.scene.tweens.add({
      targets: text,
      y: this.reduceMotion ? y : y - EMOTE.rise,
      alpha: { from: 1, to: 0 },
      duration: EMOTE.ms,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // ---- Moving about -----------------------------------------------------------------------------

  private worldOf(cell: Cell): { x: number; y: number } {
    return { x: cell.col * GRID.squareSize, y: cell.row * GRID.squareSize };
  }

  private place(view: AnimalView): void {
    view.container.setPosition(view.pos.x + view.width / 2, view.pos.y + view.height / 2);
  }

  /** Puts the animal back on the square it was placed on, and lets it rest a moment before wandering. */
  private snapHome(view: AnimalView): void {
    view.cell = { ...view.home };
    view.pos = this.worldOf(view.home);
    view.queue = [];
    view.action = null;
    view.steps = [];
    view.step = null;
    view.area = null;
    view.escapeBubble.setVisible(false);
    view.rest = random(BEHAVIOUR.restMinMs, BEHAVIOUR.restMaxMs);
  }

  /** Where the animal is going, or where it is if it is not going anywhere. */
  private targetOf(view: AnimalView): Cell {
    return view.steps[view.steps.length - 1] ?? view.step?.cell ?? view.cell;
  }

  /** The squares other animals are on or heading for, which this one keeps off. */
  private blockedFor(view: AnimalView): Set<string> {
    const blocked = new Set<string>();
    for (const other of this.views.values()) {
      if (other === view) continue;
      for (const key of rectKeys(other.cell, other.size)) blocked.add(key);
      for (const key of rectKeys(this.targetOf(other), other.size)) blocked.add(key);
    }
    return blocked;
  }

  /** The squares this animal may move about on. Worked out once for each saved version of the zoo. */
  private areaOf(view: AnimalView, zoo: Zoo): Area {
    if (view.area?.zoo === zoo) return view.area;
    const animal = zoo.animals.find((a) => a.animalId === view.id);
    let area: Area = { allowed: new Set(), gaps: null };
    if (animal && view.swims) {
      area = { allowed: swimSquares(zoo, featureCatalogue, animal), gaps: null };
    } else if (animal) {
      const home: Cell = { col: animal.col, row: animal.row };
      const info = areaInfo(zoo.fences, home);
      // Nearly fenced in: stay on the animal's own side of the gap, so it never really gets out.
      const gaps = info.closed ? null : gapView(zoo.fences, home);
      area = gaps
        ? { allowed: new Set(gaps.inner.map((s) => squareKey(s.col, s.row))), gaps: gaps.gaps }
        : { allowed: new Set(info.squares.map((s) => squareKey(s.col, s.row))), gaps: null };
    }
    view.area = { zoo, ...area };
    return view.area;
  }

  private advance(view: AnimalView, zoo: Zoo, delta: number): void {
    if (view.step) {
      this.walk(view, delta);
      return;
    }
    if (view.action?.kind === 'hold') {
      view.holdLeft -= delta;
      if (view.holdLeft <= 0) {
        view.action = null;
        view.escapeBubble.setVisible(false);
      }
      return;
    }
    if (view.action) {
      // A walk that has steps left.
      this.beginStep(view);
      return;
    }
    const next = view.queue.shift();
    if (next) {
      this.startAction(view, zoo, next);
      return;
    }
    view.rest -= delta;
    if (view.rest <= 0) this.plan(view, zoo);
  }

  /** Decides what to do next: look out of a gap now and then, otherwise stroll somewhere. */
  private plan(view: AnimalView, zoo: Zoo): void {
    const area = this.areaOf(view, zoo);
    const blocked = this.blockedFor(view);
    view.rest = random(BEHAVIOUR.restMinMs, BEHAVIOUR.restMaxMs);

    // If the animal ended up somewhere it is no longer allowed (something was built there), send it home.
    if (area.allowed.size > 0 && !fits(view.cell, view.size, area.allowed, new Set())) {
      this.snapHome(view);
      return;
    }

    const small = view.size[0] === 1 && view.size[1] === 1;
    if (area.gaps && small && !view.swims && this.clock >= view.nextPeek) {
      view.nextPeek = this.clock + random(BEHAVIOUR.peekEveryMinMs, BEHAVIOUR.peekEveryMaxMs);
      const plan = peekPlan(area.allowed, area.gaps, view.cell, blocked);
      if (plan) {
        view.queue = [
          { kind: 'goto', cell: plan.approach },
          { kind: 'hop', cell: plan.gap },
          { kind: 'hold', ms: BEHAVIOUR.peekHoldMs, bubble: true },
          { kind: 'hop', cell: plan.approach },
        ];
        return;
      }
    }

    const options = strollOptions(view.home, view.size, area.allowed, blocked, BEHAVIOUR.maxStrollSquares).filter(
      (o) => o.col !== view.cell.col || o.row !== view.cell.row,
    );
    const target = options[Math.floor(Math.random() * options.length)];
    if (target) view.queue = [{ kind: 'goto', cell: target }];
  }

  private startAction(view: AnimalView, zoo: Zoo, action: Action): void {
    if (action.kind === 'hold') {
      view.action = action;
      view.holdLeft = action.ms;
      view.escapeBubble.setVisible(action.bubble);
      return;
    }
    if (action.kind === 'hop') {
      view.action = action;
      view.steps = [action.cell];
      this.beginStep(view);
      return;
    }
    const area = this.areaOf(view, zoo);
    const path = findPath(view.cell, action.cell, view.size, area.allowed, this.blockedFor(view));
    if (path === null || path.length === 0) {
      // No way there (something is in the road): forget the rest of the plan.
      view.queue = [];
      return;
    }
    view.action = action;
    view.steps = path;
    this.beginStep(view);
  }

  private beginStep(view: AnimalView): void {
    const cell = view.steps.shift();
    if (!cell) {
      view.action = null;
      return;
    }
    const to = this.worldOf(cell);
    if (to.x !== view.pos.x) view.facing = to.x > view.pos.x ? 1 : -1;
    const ms = view.swims ? BEHAVIOUR.fishStepMs : view.smallestSide > 1 ? BEHAVIOUR.bigStepMs : BEHAVIOUR.stepMs;
    view.step = { from: { ...view.pos }, to, cell, t: 0, ms };
  }

  private walk(view: AnimalView, delta: number): void {
    const step = view.step;
    if (!step) return;
    step.t = Math.min(1, step.t + delta / step.ms);
    view.pos = { x: step.from.x + (step.to.x - step.from.x) * step.t, y: step.from.y + (step.to.y - step.from.y) * step.t };
    if (step.t < 1) return;
    view.cell = step.cell;
    view.step = null;
    if (view.steps.length === 0) view.action = null;
  }

  /** The little movements that make it look alive: a waddle or sway while moving, flapping wings, facing the way it goes. */
  private animate(view: AnimalView): void {
    const moving = view.step !== null;
    const sway = view.swims ? BEHAVIOUR.swayDegrees : BEHAVIOUR.waddleDegrees;
    const target = moving ? Math.sin(this.clock / (view.swims ? 170 : 115)) * sway : 0;
    view.body.setAngle(view.body.angle + (target - view.body.angle) * 0.35);
    view.picture.setFlipX(view.facing < 0);

    if (view.hasPose) {
      // The dragonfly hovers, so it always flaps. The others flap, or swish their tails, while they move.
      const flapping = view.id === 'dragonfly' || moving;
      const posed = flapping && Math.floor(this.clock / BEHAVIOUR.flapMs) % 2 === 1;
      const frame = this.frameFor(view, posed);
      if (view.picture.frame.name !== frame) view.picture.setFrame(frame);
    }
  }

  // ---- Making the pictures -----------------------------------------------------------------------

  private create(animal: Animal, placed: { col: number; row: number }): AnimalView {
    const width = animal.size[0] * GRID.squareSize;
    const height = animal.size[1] * GRID.squareSize;
    const home: Cell = { col: placed.col, row: placed.row };

    const picture = this.scene.add.image(0, 0, ART_KEY, spriteName.animal(animal.id));
    const nameTag = createLabel(this.scene, 0, height / 2 + 4, animal.label, width + 40)
      .setOrigin(0.5, 0)
      .setColor('#ffffff')
      .setStroke('#1e2a30', 4)
      .setVisible(false);
    const body = this.scene.add.container(0, 0, [picture]);
    const bubble = this.makeBubble(height, BUBBLES.needWater);
    const escapeBubble = this.makeBubble(height, BUBBLES.escape);
    const badge = createBubbleText(this.scene, EMOTE.happyBadge, EMOTE.badgeFontSize, '#1e2a30')
      .setPosition(width / 2 - 6, -height / 2 + 6)
      .setVisible(false);
    const container = this.scene.add.container(0, 0, [body, nameTag, bubble, escapeBubble, badge]).setDepth(DEPTH.animals);

    if (!this.reduceMotion) {
      this.scene.tweens.add({
        targets: body,
        y: -ANIMAL_STYLE.bobHeight,
        duration: ANIMAL_STYLE.bobMs / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: this.created * ANIMAL_STYLE.bobStaggerMs,
      });
    }
    this.created++;

    const view: AnimalView = {
      container,
      body,
      picture,
      bubble,
      escapeBubble,
      badge,
      nameTag,
      id: animal.id,
      size: animal.size,
      width,
      height,
      smallestSide: Math.min(animal.size[0], animal.size[1]),
      swims: featureCatalogue.livesInWater(animal.id),
      hasPose: this.scene.textures.get(ART_KEY).has(spriteName.animalPose(animal.id)),
      icon: false,
      home,
      cell: { ...home },
      pos: this.worldOf(home),
      queue: [],
      action: null,
      steps: [],
      step: null,
      holdLeft: 0,
      rest: random(BEHAVIOUR.restMinMs, BEHAVIOUR.restMaxMs),
      nextPeek: this.clock + random(BEHAVIOUR.peekEveryMinMs, BEHAVIOUR.peekEveryMaxMs),
      facing: 1,
      held: false,
      area: null,
    };
    this.views.set(animal.id, view);
    this.applyZoom(view);
    return view;
  }

  /** A speech bubble above the animal, with its icon, from the messages in the data file. */
  private makeBubble(animalHeight: number, message: Message): Phaser.GameObjects.Container {
    const { icon, text } = message;
    const words = createBubbleText(this.scene, `${icon} ${text}`, ANIMAL_STYLE.bubbleFontSize, ANIMAL_STYLE.bubbleText);
    const w = words.width + ANIMAL_STYLE.bubblePadX * 2;
    const h = words.height + ANIMAL_STYLE.bubblePadY * 2;
    const tail = 8;

    const shape = this.scene.add.graphics();
    shape.fillStyle(ANIMAL_STYLE.bubbleFill, 1);
    shape.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    shape.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + tail);
    shape.lineStyle(ANIMAL_STYLE.bubbleBorderWidth, ANIMAL_STYLE.bubbleBorder, 1);
    shape.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    return this.scene.add
      .container(0, -(animalHeight / 2 + ANIMAL_STYLE.bubbleGap + h / 2 + tail), [shape, words])
      .setVisible(false);
  }
}

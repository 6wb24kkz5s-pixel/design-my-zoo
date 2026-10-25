// Turns an animal's needs into what the side panel shows: gentle messages, the visitor line,
// and the picture checklist. All the wording comes from char-and-properties.json.

import { FALLBACK_PAINT_STYLE, GROUND_STYLE, ITEM_STYLE, TAB_COLOURS } from '../config';
import {
  ENCLOSURE_MESSAGES,
  failMessageFor,
  fillMessage,
  getAnimal,
  getAnimalMessages,
  getFeature,
  getGround,
  HAPPY_MESSAGE,
  HEART_MESSAGES,
  HINT_LABELS,
  NEEDS_DATA,
  VISITOR_MESSAGES,
  featureCatalogue,
  type Message,
} from '../data/content';
import { evaluateAnimal, HEARTS, type AnimalNeeds, type HeartId, type Reason } from '../logic/needs';
import type { Zoo } from '../logic/zoo';

/** The icon and name shown for each heart (GDD section 11). */
export const HEART_INFO: Readonly<Record<HeartId, { icon: string; label: string }>> = {
  food: { icon: '🍎', label: 'Food' },
  water: { icon: '💧', label: 'Water' },
  air: { icon: '🌬', label: 'Air' },
  home: { icon: '🏡', label: 'Home' },
  safety: { icon: '🛡', label: 'Safety' },
};

export interface HeartView {
  id: HeartId;
  icon: string;
  label: string;
  full: boolean;
  /** A short message with its own icon, when the heart is empty. */
  message: string | null;
}

/** One picture-and-name option on a checklist line (e.g. "Deep pool"). */
export interface OptionView {
  label: string;
  colour: number;
}

export interface ChecklistLineView {
  heartIcon: string;
  met: boolean;
  /** Pictures for "any one of these" lines. Empty for rule lines. */
  options: OptionView[];
  /** The wording of a rule line, e.g. "A strong fence". */
  rule: Message | null;
}

export interface PanelView {
  animalId: string;
  name: string;
  happy: boolean;
  happyText: string;
  hearts: HeartView[];
  visitor: Message;
  checklist: ChecklistLineView[];
}

/** Everything the side panel shows for one animal, or null if it is not in the zoo. */
export function buildPanelView(zoo: Zoo, animalId: string): PanelView | null {
  const needs = evaluateAnimal(zoo, featureCatalogue, NEEDS_DATA, animalId);
  const animal = getAnimal(animalId);
  if (!needs || !animal) return null;
  const name = animal.label;

  return {
    animalId,
    name,
    happy: needs.happy,
    happyText: `${HAPPY_MESSAGE.icon} ${fillMessage(HAPPY_MESSAGE.text, { animal: name.toLowerCase() })}`,
    hearts: HEARTS.map((id) => {
      const heart = needs.hearts[id];
      return {
        id,
        ...HEART_INFO[id],
        full: heart.full,
        message: heart.reason ? withIcon(messageFor(animalId, id, heart.reason), HEART_INFO[id].icon) : null,
      };
    }),
    visitor: {
      icon: VISITOR_MESSAGES[needs.view].icon,
      text: fillMessage(VISITOR_MESSAGES[needs.view].text, { animal: name.toLowerCase() }),
    },
    checklist: buildChecklistView(needs),
  };
}

/**
 * The gentle message for an empty heart. The animal's own message in the data file wins;
 * otherwise a general one is used. Messages that name the animal use its lower-case name.
 */
export function messageFor(animalId: string, heart: HeartId, reason: Reason): string {
  const own = getAnimalMessages(animalId);
  const name = (getAnimal(animalId)?.label ?? animalId).toLowerCase();
  const otherName = (id: string) => (getAnimal(id)?.label ?? id).toLowerCase();
  const generic = (key: keyof typeof HEART_MESSAGES, other?: string) =>
    fillMessage(HEART_MESSAGES[key], { animal: name, other: other ? otherName(other) : undefined });

  switch (reason.kind) {
    case 'noFood':
      return own.food ?? generic('food');
    case 'noWater':
      return own.water ?? generic('water');
    case 'leakingWater': {
      // The water source is there but leaks: its own message says why.
      return getFeature(reason.source)?.failMessage ?? own.water ?? generic('water');
    }
    case 'notInWater':
      return own.air ?? generic('air');
    case 'roofBlocksAir':
      return failMessageFor('roof')?.text ?? generic('air');
    case 'noHome':
      return own.home ?? generic('home');
    case 'gap':
      return `${ENCLOSURE_MESSAGES.gap.icon} ${ENCLOSURE_MESSAGES.gap.text}`;
    case 'open':
      return `${ENCLOSURE_MESSAGES.open.icon} ${ENCLOSURE_MESSAGES.open.text}`;
    case 'weakFence':
      return failMessageFor('fence')?.text ?? generic('safety');
    case 'bigGaps':
    case 'needsRoof':
    case 'roofGapsBig':
      return own.safety ?? generic('safety');
    case 'eats':
      return own.eats ?? generic('eats', reason.other);
    case 'eaten':
      return generic('eaten', reason.other);
    default:
      return heart === 'safety' ? generic('safety') : generic(heart);
  }
}

/**
 * Every message has a picture with it. Some of the animals' own messages in the data file
 * have no icon in the words, so those get the icon of their heart put in front.
 */
export function withIcon(message: string, icon: string): string {
  return /\p{Extended_Pictographic}/u.test(message) ? message : `${icon} ${message}`;
}

/** The colour of the little picture for a ground type or an item. */
function optionColour(id: string): number {
  const ground = GROUND_STYLE[id];
  if (ground) return ground.colour;
  const feature = getFeature(id);
  return TAB_COLOURS[feature?.tab ?? ''] ?? ITEM_STYLE.fallbackColour ?? FALLBACK_PAINT_STYLE.colour;
}

function optionLabel(id: string): string {
  return getGround(id)?.label ?? getFeature(id)?.label ?? id;
}

function buildChecklistView(needs: AnimalNeeds): ChecklistLineView[] {
  return needs.checklist.map((item) => ({
    heartIcon: HEART_INFO[item.heart].icon,
    met: item.met,
    options: item.options.map((id) => ({ label: optionLabel(id), colour: optionColour(id) })),
    rule: item.rule ? HINT_LABELS[item.rule] : null,
  }));
}

// Which picture stands for what, in buttons and panels: a feature, a ground type, an animal.

import { checkMaterial, getFeature } from '../data/content';
import { spriteName } from './names';

/** The material a feature is shown in on its card: the first one that suits the job. */
function showcaseMaterial(featureId: string): string | undefined {
  const materials = getFeature(featureId)?.materialIds ?? [];
  return materials.find((m) => checkMaterial(featureId, m).works) ?? materials[0];
}

/** The picture name for a feature or food (a pool is shown in a material that works). */
export function featurePicture(featureId: string): string {
  return spriteName.item(featureId, showcaseMaterial(featureId));
}

/** The picture name for a ground type. */
export function groundPicture(groundId: string): string {
  return spriteName.ground(groundId, 0);
}

/** The picture for something in a "needs" list: a ground type, or a feature or food. */
export function needPicture(id: string, isGround: boolean): string {
  return isGround ? groundPicture(id) : featurePicture(id);
}

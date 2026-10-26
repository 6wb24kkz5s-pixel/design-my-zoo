import { Pixels } from '../pixels';
import type { Drawing } from './ground';

// Every animal is drawn the same way: simple, chunky shapes with a dark outline. The colours are
// the same for every kind of animal, so nothing hints at how the animals are grouped.

const done = (px: Pixels): Drawing => ({ pixels: px.outline('k'), palette: {} });

/** Pose 0 is the normal picture. Pose 1 is the other half of a swim or a flap: a tail swished or wings raised. */
type Pose = 0 | 1;

function koi(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  if (pose === 0) px.triangle(0.5, 4.5, 0.5, 11.5, 5.5, 8, 'a');
  else px.triangle(0.5, 2.5, 0.5, 9.5, 5.5, 7.5, 'a');
  px.ellipse(8.5, 8, 5.6, 3.7, 'w');
  px.ellipse(7, 6.9, 2.7, 1.7, 'a').ellipse(11, 9.2, 2, 1.4, 'a');
  px.triangle(6.5, 5, 10.5, 5, 8.5, 2.2, 'b').triangle(8, 10.5, 10.5, 10.5, 8.8, 13.5, 'b');
  px.set(12, 7, 'k').set(11, 7, 'w').set(13, 9, 'b');
  return done(px);
}

function goldfish(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  if (pose === 0) {
    px.triangle(0.5, 3, 5, 8, 0.5, 8, 'b').triangle(0.5, 13, 5, 8, 0.5, 8, 'b').ellipse(3, 8, 1.6, 2, 'a');
  } else {
    px.triangle(0.5, 5, 5, 8, 0.5, 9, 'b').triangle(0.5, 11, 5, 8, 0.5, 7, 'b').ellipse(3, 8, 1.6, 1.4, 'a');
  }
  px.ellipse(9, 8, 5, 4.2, 'a').ellipse(9, 10, 3.6, 1.8, 'y');
  px.triangle(7, 4.5, 11, 4.5, 9, 1.8, 'b');
  px.ellipse(11.5, 6.8, 1.5, 1.5, 'w').set(12, 7, 'k').set(14, 9, 'b');
  return done(px);
}

function frog(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(2.8, 10.5, 2.2, 3.2, 'g').ellipse(13.2, 10.5, 2.2, 3.2, 'g');
  px.ellipse(8, 10.2, 5.6, 4.4, 'g').ellipse(8, 12, 3.4, 2.4, 'j');
  px.ellipse(8, 7.4, 4.8, 3.2, 'g');
  px.ellipse(4.8, 5, 1.9, 1.9, 'g').ellipse(11.2, 5, 1.9, 1.9, 'g');
  px.ellipse(4.8, 4.8, 1.3, 1.3, 'w').ellipse(11.2, 4.8, 1.3, 1.3, 'w').set(5, 5, 'k').set(11, 5, 'k');
  px.line(5, 8.6, 11, 8.6, 'G');
  px.ellipse(3.8, 14, 1.8, 1.1, 'G').ellipse(12.2, 14, 1.8, 1.1, 'G');
  for (const [x, y] of [[6, 10], [10, 9], [8, 11]] as const) px.set(x, y, 'G');
  return done(px);
}

function salamander(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(2, 13.5, 2, 1.1, 't').ellipse(4.5, 12, 2.6, 1.7, 't');
  px.ellipse(7.5, 9.7, 3.2, 2.2, 't').ellipse(10.5, 7, 3, 2.2, 't').ellipse(13, 4.6, 2.5, 2.3, 't');
  px.ellipse(5.5, 6.6, 1.8, 1.1, 't').ellipse(9.5, 12.2, 1.8, 1.1, 't').ellipse(13.5, 9.8, 1.5, 1, 't').ellipse(8.4, 4.2, 1.5, 1, 't');
  for (const [x, y] of [[7, 9], [10, 6], [5, 12], [9, 11], [12, 3], [3, 13]] as const) px.set(x, y, 'y');
  px.set(12, 4, 'w').set(14, 4, 'w');
  return done(px);
}

function goat(): Drawing {
  const px = new Pixels(16, 16);
  px.rect(3, 11, 2, 4, 't').rect(6, 11, 2, 4, 't').rect(9, 11, 2, 4, 't');
  px.ellipse(7, 9, 5.4, 3.5, 'l').ellipse(5.5, 9.5, 2, 1.5, 'n');
  px.rect(1, 6, 2, 3, 'l');
  px.ellipse(12.5, 5.8, 2.7, 2.4, 'l').ellipse(13.5, 7.4, 1.6, 1.8, 'l');
  px.line(11.5, 3.5, 10.5, 0.5, 'd').line(13.5, 3.2, 14.5, 0.5, 'd').set(10, 5, 'l');
  px.set(13, 5, 'k').set(14, 8, 'k').set(13, 9, 'l').set(13, 10, 'l');
  return done(px);
}

function snake(): Drawing {
  const px = new Pixels(16, 16);
  // A coiled snake seen from above.
  px.ellipse(7.5, 10, 6.6, 5, 'g').ellipse(7.5, 10, 3.4, 2, '.');
  px.ellipse(11.8, 4.6, 2.9, 2.4, 'g');
  px.set(11, 4, 'y').set(13, 4, 'y').set(10, 3, 'k').set(14, 3, 'k');
  px.line(14, 6, 15, 8, 'r').set(15, 9, 'r').set(14, 9, 'r');
  for (const [x, y] of [[3, 7], [2, 10], [4, 13], [8, 14], [12, 12], [13, 9], [6, 6]] as const) px.set(x, y, 'y');
  px.line(5, 5, 9, 6, 'G');
  return done(px);
}

function parrot(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  px.rect(2, 11, 3, 4, 'u').rect(2, 14, 3, 1, 'y').rect(4, 12, 1, 3, 'u');
  px.ellipse(7.5, 9, 4.6, 5.2, 'r');
  px.ellipse(10.8, 4.8, 3.2, 3.2, 'r');
  if (pose === 0) px.ellipse(5.8, 9.2, 2.8, 4, 'u').rect(4, 11, 3, 2, 'y');
  else px.ellipse(4.2, 5.4, 2.4, 4.2, 'u').rect(2, 2, 3, 2, 'y').ellipse(5.6, 9.2, 1.6, 2.2, 'u');
  px.triangle(13, 3.5, 15.5, 5.5, 13, 7.5, 'y').set(15, 6, 'Y');
  px.ellipse(11, 4.2, 1.2, 1.2, 'w').set(11, 4, 'k');
  px.rect(6, 14, 1, 1, 'Y').rect(9, 14, 1, 1, 'Y');
  return done(px);
}

function flamingo(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  px.line(6, 10, 6, 15, 'P').line(9, 10, 10, 13, 'P').line(10, 13, 8, 15, 'P');
  px.ellipse(7, 7.5, 5, 3.4, 'p').ellipse(5, 8, 3, 2, 'P');
  if (pose === 1) px.triangle(2, 6.5, 9, 6.5, 4, 1.2, 'p').triangle(3, 6.5, 6, 6.5, 4, 3, 'P');
  px.rect(11, 2, 2, 6, 'p').line(11, 2, 13, 1, 'p');
  px.ellipse(13, 2, 2, 1.6, 'p');
  px.triangle(13.5, 1.5, 15.8, 3, 13.5, 3.6, 'k').set(13, 1, 'w');
  px.rect(1, 6, 3, 1, 'P');
  return done(px);
}

function beetle(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  if (pose === 1) px.ellipse(2.6, 8, 2.6, 4.4, 'v').ellipse(13.4, 8, 2.6, 4.4, 'v');
  for (const y of [5, 8, 11]) px.line(2, y - 1, 5, y, 'k').line(14, y - 1, 11, y, 'k');
  px.ellipse(8, 9.2, 4.6, 5.6, 'C');
  px.ellipse(8, 3.2, 2.6, 2, 'k').line(6, 1, 4, 0, 'k').line(10, 1, 12, 0, 'k');
  px.line(8, 5.5, 8, 14, 'k');
  px.ellipse(5.8, 8, 1.2, 2.6, 'c').ellipse(10.2, 8, 1.2, 2.6, 'c');
  return done(px);
}

function dragonfly(pose: Pose = 0): Drawing {
  const px = new Pixels(16, 16);
  if (pose === 0) {
    px.ellipse(3.6, 5.8, 3.6, 1.7, 'v').ellipse(12.4, 5.8, 3.6, 1.7, 'v');
    px.ellipse(4.2, 9.2, 3.4, 1.6, 'v').ellipse(11.8, 9.2, 3.4, 1.6, 'v');
    px.line(2, 5, 5, 5, 'w').line(11, 5, 14, 5, 'w');
  } else {
    px.ellipse(3.8, 8, 3.6, 1.7, 'v').ellipse(12.2, 8, 3.6, 1.7, 'v');
    px.ellipse(4.4, 11.4, 3.2, 1.5, 'v').ellipse(11.6, 11.4, 3.2, 1.5, 'v');
    px.line(2, 7, 5, 7, 'w').line(11, 7, 14, 7, 'w');
  }
  px.rect(7, 3, 2, 12, 'C');
  for (const y of [6, 9, 12]) px.rect(7, y, 2, 1, 'c');
  px.ellipse(8, 3, 2.4, 2.2, 'C').set(6, 2, 'r').set(9, 2, 'r');
  return done(px);
}

function hippo(): Drawing {
  const px = new Pixels(32, 32);
  px.rect(5, 26, 5, 5, 'Q').rect(22, 26, 5, 5, 'Q').rect(11, 27, 4, 4, 'Q').rect(17, 27, 4, 4, 'Q');
  px.ellipse(16, 23, 14.4, 8, 'q');
  px.ellipse(16, 12.5, 11.5, 8.6, 'q');
  px.ellipse(6.5, 5.5, 3, 3, 'q').ellipse(25.5, 5.5, 3, 3, 'q');
  px.ellipse(6.5, 5.8, 1.6, 1.6, 'p').ellipse(25.5, 5.8, 1.6, 1.6, 'p');
  px.ellipse(16, 17.6, 8.8, 5.6, 'Q').ellipse(16, 17, 7.8, 4.6, 'q');
  px.ellipse(12.8, 16.4, 1.1, 1.1, 'k').ellipse(19.2, 16.4, 1.1, 1.1, 'k');
  px.ellipse(9.6, 9.2, 2.2, 2.2, 'w').ellipse(22.4, 9.2, 2.2, 2.2, 'w').ellipse(10, 9.4, 1, 1, 'k').ellipse(22, 9.4, 1, 1, 'k');
  px.line(11, 20.6, 21, 20.6, 'Q');
  px.rect(14, 21, 1, 2, 'w').rect(17, 21, 1, 2, 'w');
  px.ellipse(14, 25, 5.4, 3.4, 'Q').ellipse(18, 25, 4, 2.6, 'q');
  return done(px);
}

function crocodile(): Drawing {
  const px = new Pixels(32, 16);
  px.triangle(0.5, 7.5, 9, 4.5, 9, 11, 'G').triangle(3, 8, 11, 6, 11, 10, 'G');
  px.ellipse(14, 8.6, 9.6, 3.8, 'g');
  px.rect(20, 5, 11, 5, 'g').rect(21, 9, 10, 2, 'G');
  px.ellipse(14, 10.4, 7.5, 1.8, 'j');
  px.rect(5, 12, 3, 3, 'G').rect(18, 12, 3, 3, 'G').rect(7, 2, 3, 2, 'G').rect(18, 2, 3, 2, 'G');
  for (const x of [11, 13, 15]) px.triangle(x, 4.6, x + 2, 4.6, x + 1, 2, 'h');
  for (let x = 22; x < 31; x += 2) px.set(x, 10, 'w');
  px.ellipse(22.5, 5.4, 1.3, 1.3, 'y').set(22, 5, 'k').set(30, 6, 'k');
  return done(px);
}

/** The animals that have a second picture, for swimming or flapping, with how to draw it. */
export const ANIMAL_POSES: Readonly<Record<string, () => Drawing>> = {
  koi: () => koi(1),
  goldfish: () => goldfish(1),
  parrot: () => parrot(1),
  flamingo: () => flamingo(1),
  beetle: () => beetle(1),
  dragonfly: () => dragonfly(1),
};

/** The picture of each animal, by its id in the data file. */
export const ANIMAL_DRAWINGS: Readonly<Record<string, () => Drawing>> = {
  koi,
  goldfish,
  frog,
  salamander,
  hippopotamus: hippo,
  goat,
  crocodile,
  snake,
  parrot,
  flamingo,
  beetle,
  dragonfly,
};

/** 0x74c44c → "#74c44c", for using config colours in CSS. */
export function cssColour(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

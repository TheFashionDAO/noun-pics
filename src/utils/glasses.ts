import { ImageData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';
import * as R from 'ramda';

export const getRandomGlasses = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { bgcolors, palette, images } = ImageData;
  let { glasses } = images;
  glasses = glasses.map(R.identity);
  const ri = Math.floor(glasses.length * Math.random());
  const randomGlasses = glasses[ri];
  return buildSVG([randomGlasses], palette, '111111');
};

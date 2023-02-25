import { SVGOptions } from 'src/types/svg';

export const cachePath = (
  nounId: number,
  imageSize: number,
  options: SVGOptions,
  format: string,
) =>
  `/tmp/nouns/${nounId}-${imageSize}-${[
    options.removeBackground ? 'rmb' : '',
    format,
  ].join('_')}.${format}`;

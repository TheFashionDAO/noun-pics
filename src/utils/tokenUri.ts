import { TokenUri } from 'src/types/tokenUri';

export const parseBase64TokenUri = (dataURI: string | TokenUri) =>
  JSON.parse(Buffer.from(String(dataURI).substring(29), 'base64').toString());

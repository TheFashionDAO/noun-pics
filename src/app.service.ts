import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider } from '@ethersproject/providers';
import { getContractsForChainOrThrow, DecodedImage } from '@nouns/sdk';
import { parseBase64TokenUri } from './utils/tokenUri';
import { TokenUri } from './types/tokenUri';
import * as sharp from 'sharp';
import defaults from './utils/constants';
import { allNouns, nounsForAddress } from './utils/theGraph';
import { Noun } from './types/noun';
import * as R from 'ramda';
import constants from './utils/constants';
import * as fs from 'fs';
import { cachePath as computeCachePath } from './utils/cachePath';
import ENS, { getEnsAddress } from '@ensdomains/ensjs';
import { ImageData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';
import { getRandomGlasses } from './utils/glasses';

export const DEFAULT_IMAGE_SIZE = 320

@Injectable()
export class AppService {
  private provider: JsonRpcProvider;
  private contracts;
  private ens;

  constructor(private readonly configService: ConfigService) {
    const jsonRpcUrl = this.configService.get<string>('JSON_RPC_URL');
    const chainId = this.configService.get<number>('CHAIN_ID') || 1;
    this.provider = new JsonRpcProvider(jsonRpcUrl);
    this.contracts = getContractsForChainOrThrow(chainId, this.provider);
    this.ens = new ENS({
      provider: this.provider,
      ensAddress: getEnsAddress('1'),
    });
  }

  async getTokenUri(id: number): Promise<TokenUri> {
    const tokenUri = await this.contracts.nounsTokenContract.tokenURI(id);
    if (!tokenUri) throw new Error('No tokenURI for that token ID');
    return parseBase64TokenUri(tokenUri);
  }

  async getSvg(id: number): Promise<string> {
    const tokenUri = await this.getTokenUri(id);
    return tokenUri.image;
  }

  async getRawSvg(id: number): Promise<Buffer> {
    return Buffer.from((await this.getSvg(id)).substr(26), 'base64');
  }

  async getSharp(id: number): Promise<any> {
    const svg = await this.getRawSvg(id);
    return sharp(svg);
  }

  async getPng(id: number, imageSize: number = DEFAULT_IMAGE_SIZE): Promise<any> {
    const cachePath = computeCachePath(id, imageSize, 'png');
    if (fs.existsSync(cachePath)) {
      return await sharp(cachePath);
    }
    const sharpedSvg = await this.getSharp(id);
    await sharpedSvg.resize(imageSize, imageSize).toFormat('png').toFile(cachePath);
    return await sharp(cachePath);
  }

  async getAddressNouns(
    address: string,
    delegates: boolean = false,
  ): Promise<Noun[]> {
    return nounsForAddress(address, delegates);
  }

  async getAddressNounIds(
    address: string,
    delegates: boolean = false,
  ): Promise<number[]> {
    return R.map(
      R.prop('id'),
      await this.getAddressNouns(address, delegates),
    ).sort((a, b) => a - b);
  }

  async resolveEnsName(name: string): Promise<string> {
    return this.ens.name(name).getAddress();
  }

  async getAddressNounTile(
    address: string,
    delegates: boolean = false,
  ): Promise<any> {
    const nounIds = await this.getAddressNounIds(address, delegates);
    const tileSideCount = Math.ceil(Math.sqrt(nounIds.length));
    const fullSlideCount = Math.pow(tileSideCount, 2)
    const nounImageSideLength = Math.floor(
      constants.DEFAULT_HEIGHT / tileSideCount,
    );
    const nounPngs = [];

    const left = (n) => Math.floor(n % tileSideCount) * nounImageSideLength;
    const top = (n) => Math.floor(n / tileSideCount) * nounImageSideLength;

    // Generate on disk cache
    for (let i in nounIds) {
      const nounId = nounIds[i];
      const png = (await this.getPng(nounId)).resize({
        width: nounImageSideLength,
      });
      const imageBuffer = await png.toBuffer();
      nounPngs.push({
        input: imageBuffer,
        top: top(i),
        left: left(i),
      });
    }

    for (let i = nounPngs.length; i < fullSlideCount; i++) {
      const glasses = (sharp(Buffer.from(this.getRandomDarkGlasses()))).resize({
        width: nounImageSideLength
      })
      const imageBuffer = await glasses.toBuffer();
      nounPngs.push({
        input: imageBuffer,
        top: top(i),
        left: left(i),
      })
    }
    
    const base = await sharp({
      create: {
        width: constants.DEFAULT_WIDTH,
        height: constants.DEFAULT_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    }).composite(nounPngs);
    return base;
  }

  getRandomDarkGlasses() {
    return getRandomGlasses()
  }
}

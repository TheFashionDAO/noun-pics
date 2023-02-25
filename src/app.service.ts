import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseBase64TokenUri } from './utils/tokenUri';
import { TokenUri } from './types/tokenUri';
import sharp from 'sharp';
// import defaults from './utils/constants';
import { allNouns, nounsForAddress } from './utils/theGraph';
import { Noun } from './types/noun';
import * as R from 'ramda';
import constants from './utils/constants';
import * as fs from 'fs';
import { cachePath as computeCachePath } from './utils/cachePath';
import ENS, { getEnsAddress } from '@ensdomains/ensjs';
// import { ImageData } from '@nouns/assets';
import { Contracts } from '@nouns/sdk/dist/contract/types';
import { getRandomGlasses } from './utils/glasses';
import { SVGOptions } from './types/svg';
import { RedisCache as Cache } from 'cache-manager-ioredis-yet';
import { getContractsForChainOrThrow } from './utils/contracts';

export const DEFAULT_IMAGE_SIZE = 320;

@Injectable({ scope: Scope.DEFAULT })
export class AppService {
  private network: string;
  private version: string;
  private provider: JsonRpcProvider;
  private contracts: Contracts;
  private ens: typeof ENS;
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    const jsonRpcUrl = this.configService?.get<string>('JSON_RPC_URL');
    const chainId =
      this.configService.get<number>('ADDRESS_ID') ||
      this.configService.get<number>('CHAIN_ID') ||
      1;
    this.provider = new JsonRpcProvider(jsonRpcUrl);
    this.contracts = getContractsForChainOrThrow(chainId, this.provider);
    this.ens = new ENS({
      provider: this.provider,
      ensAddress: getEnsAddress('1'),
    });
    this.logger.debug(
      `Nouns token contract address: ${this.contracts.nounsTokenContract.address}`,
    );
  }

  buildTokenUriCacheKey = (id: number) => `tokenUri_${id}`;

  async getTokenUri(id: number): Promise<TokenUri> {
    this.logger.debug(`Getting token address for: ${id}`);
    try {
      const tokenOwner = await this.contracts.nounsTokenContract.ownerOf(id);
      this.logger.debug(`Token ID ${id} Owner: ${tokenOwner.toString()}`);
    } catch {
      throw new Error(`Token ID ${id} has no owner!`);
    }

    let tokenUri = await this.cacheManager.get<TokenUri | null>(
      this.buildTokenUriCacheKey(id),
    );
    if (!tokenUri) {
      this.logger.verbose(`Cache miss for ${id}`);
      const tokenContractUri = await this.contracts.nounsTokenContract.tokenURI(
        id,
      );
      tokenUri = parseBase64TokenUri(tokenContractUri);
      if (tokenUri) {
        // Fetching non-existent will throw but just be safe
        this.logger.verbose(`Writing cache for ${id}`);
        await this.cacheManager.set(this.buildTokenUriCacheKey(id), tokenUri);
      }
    }
    if (!tokenUri) throw new Error('No tokenURI for that token ID');
    return tokenUri;
  }

  async getSvg(id: number): Promise<string> {
    const tokenUri = await this.getTokenUri(id);
    return tokenUri.image;
  }

  async getAddress(id: number): Promise<TokenUri> {
    return await this.getTokenUri(id);
  }

  async getRawSvg(id: number, options: SVGOptions = {}): Promise<Buffer> {
    const svg = await this.getSvg(id);
    let svgBuf: Buffer;
    if (options.removeBackground) {
      svgBuf = Buffer.from(
        svg
          .toString()
          .replace(
            /<rect width="100%" height="100%" fill="#(e1d7d5|d5d7e1)" \/>/,
            '',
          ),
      );
    }
    svgBuf = Buffer.from(svg.substr(26), 'base64');
    return svgBuf;
  }

  async getSharp(id: number, options: SVGOptions = {}): Promise<any> {
    const svg = await this.getRawSvg(id, options);
    return sharp(svg);
  }

  async getPng(
    id: number,
    imageSize: number,
    options: SVGOptions = {},
  ): Promise<any> {
    const cachePath = computeCachePath(id, imageSize, options, 'png');
    if (fs.existsSync(cachePath)) {
      return sharp(cachePath);
    }
    const sharpedSvg = await this.getSharp(id, options);
    await sharpedSvg
      .resize(imageSize, imageSize, {
        kernel: 'nearest',
      })
      .toFormat('png')
      .toFile(cachePath);
    return sharp(cachePath);
  }

  async getNouns(network?: string, version?: string): Promise<Noun[]> {
    return await allNouns(network, version);
  }

  async getAddressNouns(address: string, delegates = false): Promise<Noun[]> {
    return nounsForAddress(address, delegates);
  }

  async getAddressNounIds(
    address: string,
    delegates = false,
  ): Promise<number[]> {
    return R.map(
      R.prop('id'),
      await this.getAddressNouns(address, delegates),
    ).sort((a, b) => a - b);
  }

  async resolveEnsName(name: string): Promise<string> {
    const ensName = this.ens.name(name);
    return await ensName?.getAddress();
  }

  async getAddressNounTile(address: string, delegates = false): Promise<any> {
    const nounIds = await this.getAddressNounIds(address, delegates);
    const tileSideCount = Math.ceil(Math.sqrt(nounIds.length));
    const fullSlideCount = Math.pow(tileSideCount, 2);
    const nounImageSideLength = Math.floor(
      constants.DEFAULT_HEIGHT / tileSideCount,
    );
    const nounPngs = [];

    const left = (n: number) =>
      Math.floor(n % tileSideCount) * nounImageSideLength;
    const top = (n: number) =>
      Math.floor(n / tileSideCount) * nounImageSideLength;

    // Generate on disk cache
    for (const i in nounIds) {
      const nounId = nounIds[i];
      const png = (await this.getPng(nounId, DEFAULT_IMAGE_SIZE)).resize({
        width: nounImageSideLength,
      });
      const imageBuffer = await png.toBuffer();
      nounPngs.push({
        input: imageBuffer,
        top: top(parseFloat(i)),
        left: left(parseFloat(i)),
      });
    }

    for (let i = nounPngs.length; i < fullSlideCount; i++) {
      const glasses = sharp(Buffer.from(this.getRandomDarkGlasses())).resize(
        nounImageSideLength,
        nounImageSideLength,
        { kernel: 'nearest' },
      );
      const imageBuffer = await glasses.toBuffer();
      nounPngs.push({
        input: imageBuffer,
        top: top(i),
        left: left(i),
      });
    }

    const base = sharp({
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
    return getRandomGlasses();
  }
}

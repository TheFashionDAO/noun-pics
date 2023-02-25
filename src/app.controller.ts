import {
  Controller,
  Get,
  // Header,
  HttpCode,
  // HttpStatus,
  Logger,
  Param,
  Query,
  Render,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import * as fs from 'fs';
// import { cachePath as computeCachePath } from './utils/cachePath';
// import { getRandomGlasses } from './utils/glasses';
import * as R from 'ramda';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  getHello(): string {
    return '';
  }

  @Get('favicon.ico')
  @HttpCode(404)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getFavicon() {}

  @Get('tokenUri/:id')
  async getTokenUri(@Param('id') id: number) {
    this.logger.verbose(`Handling tokenUri/${id}`);
    return this.appService.getTokenUri(id);
  }

  @Get(':id.svg')
  async getSvg(
    @Param('id') id: number,
    @Res() res: Response,
    @Query('removeBackground') removeBackground: boolean,
  ) {
    this.logger.verbose(`Handling ${id}.svg`);
    const cacheName = [id, removeBackground ? 'rmb' : ''].join('_');
    // return (await this.appService.getRawSvg(id)).toString();
    const cachePath = `/tmp/nouns/${cacheName}.svg`;
    if (!fs.existsSync(cachePath)) {
      const svg = (
        await this.appService.getRawSvg(id, { removeBackground })
      ).toString();
      fs.writeFileSync(cachePath, svg);
    }
    res.sendFile(cachePath);
    return;
  }

  @Get('0x:address')
  async getAddressNouns(
    @Param('address') addr: string,
    @Res() res: Response,
    @Query('includeDelegates') includeDelegates: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('size') size: string,
  ) {
    this.logger.verbose(`Handling address 0x${addr}`);
    const fullAddress = `0x${addr}`;
    const nounTile = await this.appService.getAddressNounTile(
      fullAddress,
      includeDelegates === 'true',
    );
    nounTile.toFormat('png').pipe(res);
  }

  @Get(':ens.eth')
  async getEnsNameNouns(
    @Param('ens') ens: string,
    @Res() res: Response,
    @Query('includeDelegates') includeDelegates: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('size') size: string,
  ) {
    this.logger.verbose(`Handling ens ${ens}.eth`);
    const fullAddress = await this.appService.resolveEnsName(`${ens}.eth`);
    const nounTile = await this.appService.getAddressNounTile(
      fullAddress,
      includeDelegates === 'true',
    );
    nounTile.toFormat('png').pipe(res);
  }

  @Get('/range')
  async getRange(@Query('start') start: number, @Query('end') end: number) {
    // Latch and correct order
    start = start ? Number(start) : 0;
    end = end ? Number(end) : 0;
    start = start - end < 0 ? start : end;
    end = start - end < 0 ? end : start;

    return await Promise.all(
      new Array(Math.abs(end - start + 1)).fill(0).map(async (_, i) => {
        const id = i + start;
        return {
          id,
          svg: (await this.appService.getSvg(id)).toString(),
        };
      }),
    );
  }

  @Get(':id')
  async getImage(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('size') size: string,
    @Query('removeBackground') removeBackground: boolean,
  ) {
    this.logger.verbose(`Handling id ${id}`);
    const imageSize = this.flattenSize(size);
    const idParts = id.split('.');
    const nounId = parseInt(idParts[0]);
    const format = idParts[1] || 'png';

    const png = await this.appService.getPng(nounId, imageSize, {
      removeBackground,
    });
    png.toFormat(format).pipe(res);
    return;
  }

  private flattenSize = (size: number | string) =>
    R.min(size ? Number(size) : 320, 1600);
}

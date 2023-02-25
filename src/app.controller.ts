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
import express from 'express';
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
  getHello(): Record<string, any> {
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT}`;
    return { baseUrl };
  }

  @Get('favicon.ico')
  @HttpCode(404)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getFavicon() {}

  @Get('tokenUri/:id')
  async getTokenUri(@Param('id') id: number, @Res() res: express.Response) {
    this.logger.verbose(`Handling tokenUri/${id}`);

    try {
      const result = await this.appService.getTokenUri(id);
      res.status(200).json(result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get(':id.svg')
  async getSvg(
    @Param('id') id: number,
    @Res() res: express.Response,
    @Query('removeBackground') removeBackground: boolean,
  ) {
    this.logger.verbose(`Handling ${id}.svg`);

    try {
      const cacheName = [id, removeBackground ? 'rmb' : ''].join('_');
      let rawSvg: Buffer;
      const cachePath = `/tmp/nouns/${cacheName}.svg`;
      if (!fs.existsSync(cachePath)) {
        rawSvg = await this.appService.getRawSvg(id, { removeBackground });
        const svg = rawSvg.toString();
        fs.writeFileSync(cachePath, svg);
      }
      res.sendFile(cachePath);
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get('0x:address')
  async getAddressNouns(
    @Param('address') addr: string,
    @Res() res: express.Response,
    @Query('includeDelegates') includeDelegates: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('size') size: string,
  ) {
    this.logger.verbose(`Handling address 0x${addr}`);

    try {
      const fullAddress = `0x${addr}`;
      const nounTile = await this.appService.getAddressNounTile(
        fullAddress,
        includeDelegates === 'true',
      );
      nounTile.toFormat('png').pipe(res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get(':ens.eth')
  async getEnsNameNouns(
    @Param('ens') ens: string,
    @Res() res: express.Response,
    @Query('includeDelegates') includeDelegates: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('size') size: string,
  ) {
    this.logger.verbose(`Handling ens ${ens}.eth`);

    try {
      const fullAddress = await this.appService.resolveEnsName(`${ens}.eth`);
      const nounTile = await this.appService.getAddressNounTile(
        fullAddress,
        includeDelegates === 'true',
      );
      nounTile.toFormat('png').pipe(res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get('/range')
  async getRange(
    @Query('start') start: number,
    @Query('end') end: number,
    @Res() res: express.Response,
  ) {
    this.logger.verbose(`Handling range ${start} to ${end}`);

    try {
      // Latch and correct order
      start = start ? Number(start) : 0;
      end = end ? Number(end) : 0;
      start = start - end < 0 ? start : end;
      end = start - end < 0 ? end : start;
      const result = await Promise.all(
        new Array(Math.abs(end - start + 1)).fill(0).map(async (_, i) => {
          const id = i + start;
          let svg: string;
          try {
            svg = await this.appService.getSvg(id);
          } catch (error) {
            if (error instanceof Error) {
              return {
                id,
                svg: null,
                error: error.message,
              };
            }
            return {
              id,
              svg: null,
              error: `Unknown Error: ${error}`,
            };
          }
          return {
            id,
            svg: svg,
          };
        }),
      );
      res.status(201).json(result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get('/nouns')
  async getNouns(
    @Res() res: express.Response,
    @Query('net') network?: string,
    @Query('ver') version?: string,
  ) {
    this.logger.verbose(`Handling nouns: ${network}/${version}`);

    try {
      const results = await this.appService.getNouns(network, version);
      res.status(201).json(results);
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  @Get(':id')
  async getImage(
    @Param('id') id: string,
    @Res() res: express.Response,
    @Query('size') size: string,
    @Query('removeBackground') removeBackground: boolean,
  ) {
    this.logger.verbose(`Handling id ${id}`);

    try {
      const imageSize = this.flattenSize(size);
      const idParts = id.split('.');
      const nounId = parseInt(idParts[0]);
      const format = idParts[1] || 'png';

      const png = await this.appService.getPng(nounId, imageSize, {
        removeBackground,
      });
      png.toFormat(format).pipe(res);
      return;
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({ error: error.message });
        return;
      }
      res.status(400).send({ error: `Unknown Error: ${error}` });
      return;
    }
  }

  private flattenSize = (size: number | string) =>
    R.min(size ? Number(size) : 320, 1600);
}

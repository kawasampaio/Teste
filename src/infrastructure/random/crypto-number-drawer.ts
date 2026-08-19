import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

import type { NumberDrawerPort } from '../../application/ports/number-drawer.port';

@Injectable()
export class CryptoNumberDrawer
  implements NumberDrawerPort
{
  draw(
    min: number,
    max: number,
  ): number {
    return randomInt(
      min,
      max + 1,
    );
  }
}
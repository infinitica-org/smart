import { Global, Module } from '@nestjs/common';
import { env } from './env.js';

export const ENV = Symbol('ENV');

@Global()
@Module({
  providers: [{ provide: ENV, useValue: env }],
  exports: [ENV],
})
export class ConfigModule {}

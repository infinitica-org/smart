import { Module } from '@nestjs/common';
import { EvidenceCatalogService } from '../evidence/evidence-catalog.service.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, EvidenceCatalogService],
  exports: [CatalogService, EvidenceCatalogService],
})
export class CatalogModule {}

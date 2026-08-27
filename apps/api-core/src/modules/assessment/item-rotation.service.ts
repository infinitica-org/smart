import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface SelectedForm {
  formCode: string;
  items: Array<{
    id: string;
    stem: string;
    itemType: string;
    difficultyTag: string;
    competencyId: string;
    formCode: string;
    options: Array<{ label: string; text: string }>;
  }>;
}

@Injectable()
export class ItemRotationService {
  private readonly logger = new Logger(ItemRotationService.name);
  private readonly threshold = env.ITEM_RETIREMENT_THRESHOLD;

  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  /**
   * Picks the parallel form with the lowest average exposure for a given level.
   * Forms listed in `excludeForms` are skipped (e.g. form already seen this session).
   */
  async selectForm(levelId: string, excludeForms: string[] = []): Promise<SelectedForm> {
    const candidates = await this.db.item.groupBy({
      by: ['formCode'],
      where: { levelId, active: true, NOT: { formCode: { in: excludeForms } } },
      _avg: { exposureCount: true },
      _count: { id: true },
    });

    if (!candidates.length) {
      this.logger.warn({ levelId }, 'No active items available — all retired or excluded');
      throw new NotFoundException(
        'All items for this level are retired. Contact your administrator.',
      );
    }

    const best = candidates.reduce((a, b) =>
      (a._avg.exposureCount ?? 0) <= (b._avg.exposureCount ?? 0) ? a : b,
    );

    this.logger.log({ levelId, formCode: best.formCode }, 'item-rotation.form-selected');

    const items = await this.db.item.findMany({
      where: { levelId, formCode: best.formCode, active: true },
      select: {
        id: true,
        stem: true,
        itemType: true,
        difficultyTag: true,
        competencyId: true,
        formCode: true,
        options: { select: { label: true, text: true } },
      },
    });

    return { formCode: best.formCode, items };
  }

  /**
   * Increments exposure for each item and retires any that reach the threshold.
   * Both writes run in a single transaction for atomicity.
   */
  async recordExposure(itemIds: string[]): Promise<{ retired: number }> {
    const [, retireResult] = await this.db.$transaction([
      this.db.item.updateMany({
        where: { id: { in: itemIds } },
        data: { exposureCount: { increment: 1 } },
      }),
      this.db.item.updateMany({
        where: { id: { in: itemIds }, exposureCount: { gte: this.threshold } },
        data: { active: false },
      }),
    ]);

    if (retireResult.count > 0) {
      this.logger.warn(
        { retired: retireResult.count, threshold: this.threshold },
        'item-rotation.items-retired',
      );
    }

    return { retired: retireResult.count };
  }
}

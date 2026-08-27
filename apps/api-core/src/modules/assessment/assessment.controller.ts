import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { AssessmentService } from './assessment.service.js';

@ApiTags('assessment')
@Controller(`${API_PREFIX}/assessment`)
export class AssessmentController {
  constructor(
    @Inject(AssessmentService) private readonly service: AssessmentService,
    @Inject(ItemRotationService) private readonly rotation: ItemRotationService,
  ) {}
  constructor(@Inject(AssessmentService) private readonly service: AssessmentService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'assessment',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }

  /**
   * S1-VG-03 — parallel-form selection with exposure tracking.
   * Returns the item form with the lowest average exposure for the requested level.
   * Increments exposure counters atomically; retires items that hit the threshold.
   */
  @Post('next-form')
  @ApiOperation({
    summary: 'Select next item form (parallel-form rotation + exposure tracking)',
  })
  @ApiBody({ type: NextFormRequestDto })
  async nextForm(@Body() body: NextFormRequestDto) {
    const { formCode, items } = await this.rotation.selectForm(
      body.levelId,
      body.excludeForms ?? [],
    );
    const { retired } = await this.rotation.recordExposure(items.map((i) => i.id));
    return { formCode, itemCount: items.length, retired, items };
  }
}

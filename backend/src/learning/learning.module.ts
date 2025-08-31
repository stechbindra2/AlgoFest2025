import { Module } from '@nestjs/common';

import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { QuizService } from './quiz.service';
import { ProgressService } from './progress.service';
import { AdaptiveModule } from '../adaptive/adaptive.module';

@Module({
  imports: [AdaptiveModule],
  controllers: [LearningController],
  providers: [LearningService, QuizService, ProgressService],
  exports: [LearningService, QuizService, ProgressService],
})
export class LearningModule {}

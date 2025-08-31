import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { QuestionGeneratorService } from './question-generator.service';
import { ContentAdapterService } from './content-adapter.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, QuestionGeneratorService, ContentAdapterService],
  exports: [AiService, QuestionGeneratorService, ContentAdapterService],
})
export class AiModule {}

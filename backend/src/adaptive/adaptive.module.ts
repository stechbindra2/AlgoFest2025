import { Module } from '@nestjs/common';

import { AdaptiveController } from './adaptive.controller';
import { AdaptiveService } from './adaptive.service';
import { BanditService } from './bandit.service';
import { MasteryService } from './mastery.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AdaptiveController],
  providers: [AdaptiveService, BanditService, MasteryService],
  exports: [AdaptiveService, BanditService, MasteryService],
})
export class AdaptiveModule {}

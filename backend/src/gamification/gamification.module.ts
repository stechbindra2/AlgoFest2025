import { Module } from '@nestjs/common';

import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { BadgeService } from './badge.service';
import { LeaderboardService } from './leaderboard.service';
import { StreakService } from './streak.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [GamificationController],
  providers: [GamificationService, BadgeService, LeaderboardService, StreakService],
  exports: [GamificationService, BadgeService, LeaderboardService, StreakService],
})
export class GamificationModule {}

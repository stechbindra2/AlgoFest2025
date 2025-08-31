import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@User() user: any) {
    return this.usersService.findById(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@User() user: any, @Body() updateData: UpdateUserDto) {
    return this.usersService.updateProfile(user.sub, updateData);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user learning progress' })
  @ApiResponse({ status: 200, description: 'Progress data returned' })
  async getProgress(@User() user: any) {
    return this.usersService.getUserProgress(user.sub);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get user badges' })
  @ApiResponse({ status: 200, description: 'User badges returned' })
  async getBadges(@User() user: any) {
    return this.usersService.getUserBadges(user.sub);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiResponse({ status: 200, description: 'Leaderboard returned' })
  async getLeaderboard(@User() user: any) {
    return this.usersService.getLeaderboard(user.sub);
  }
}

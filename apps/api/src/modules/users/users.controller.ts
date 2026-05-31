import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString, MaxLength } from 'class-validator';

class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profil user saat ini' })
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profil' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Leaderboard global' })
  getLeaderboard(
    @Query('category') category: 'pr_score' | 'win_rate' | 'streak' | 'contrarian' = 'pr_score',
    @Query('limit') limit = 50,
  ) {
    return this.usersService.getLeaderboard(category, +limit);
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Get profil user by wallet address' })
  getProfileByAddress(@Param('address') address: string) {
    return this.usersService.getProfileByWallet(address);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profil user by ID' })
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow user' })
  followUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.followUser(user.id, targetId);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow user' })
  unfollowUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.unfollowUser(user.id, targetId);
  }
}

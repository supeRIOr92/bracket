import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
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
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
    @Query('category') category: 'pr_score' | 'win_rate' | 'streak' | 'contrarian' | 'roi' = 'pr_score',
    @Query('limit') limit = 50,
  ) {
    return this.usersService.getLeaderboard(category, +limit);
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Get profil user by wallet address' })
  getProfileByAddress(
    @Param('address') address: string,
    @Headers('authorization') auth?: string,
  ) {
    let requesterId: string | undefined;
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = this.jwtService.decode(token) as any;
        requesterId = payload?.sub;
      } catch {}
    }
    return this.usersService.getProfileByWallet(address, requesterId);
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

    @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cek apakah current user follow user ini' })
  async getFollowStatus(
    @CurrentUser() user: any,
    @Param('id') targetId: string,
  ) {
    return this.usersService.getFollowStatus(user.id, targetId);
  }

    @Get(':id/following')
    @ApiOperation({ summary: 'following user list' })
    getFollowing(@Param('id') id: string) {
      return this.usersService.getFollowing(id);
    }

    @Get(':id/followers')
    @ApiOperation({ summary: 'List follower this user' })
    getFollowers(@Param('id') id: string) {
      return this.usersService.getFollowers(id);
    }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow user' })
  unfollowUser(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.usersService.unfollowUser(user.id, targetId);
  }
}

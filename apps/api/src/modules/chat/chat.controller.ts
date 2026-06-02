import {
  Controller, Get, Post, Body, Param, UseGuards, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateCommentDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':marketId/comments')
  getComments(
    @Param('marketId') marketId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getComments(marketId, Math.min(limit, 100));
  }

  @Get(':marketId/activity')
  getActivity(
    @Param('marketId') marketId: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getActivity(marketId, Math.min(limit, 50));
  }

  @Post(':marketId/comments')
  @UseGuards(JwtAuthGuard)
  postComment(
    @Param('marketId') marketId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.chatService.postComment(marketId, user.id, dto.content);
  }
}

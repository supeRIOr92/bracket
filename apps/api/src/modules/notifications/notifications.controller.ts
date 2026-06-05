import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
constructor(private readonly notificationsService: NotificationsService) {}

@Get()
getNotifications(@Req() req: any) {
return this.notificationsService.getNotifications(req.user.id);
}

@Patch('read-all')
markAllRead(@Req() req: any) {
return this.notificationsService.markAllRead(req.user.id);
}

@Patch(':id/read')
markOneRead(@Req() req: any, @Param('id') id: string) {
return this.notificationsService.markOneRead(req.user.id, id);
}
}

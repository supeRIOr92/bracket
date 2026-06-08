import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
imports: [AuthModule, NotificationsModule],
controllers: [UsersController],
providers: [UsersService],
exports: [UsersService],
})
export class UsersModule {}

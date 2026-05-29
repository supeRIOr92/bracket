import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JackpotService } from './jackpot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('jackpot')
@Controller('jackpot')
export class JackpotController {
constructor(private jackpotService: JackpotService) {}

@Get('current')
@ApiOperation({ summary: 'Info jackpot saat ini' })
getCurrentJackpot() {
return this.jackpotService.getCurrentJackpot();
}

@Get('eligibility')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Cek eligibility jackpot user' })
checkEligibility(@CurrentUser() user: any) {
return this.jackpotService.checkEligibility(user.id);
}
}
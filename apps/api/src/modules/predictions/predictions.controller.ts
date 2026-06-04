import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PredictionsService } from './predictions.service';
import { RecordPredictionDto, RecordClaimDto } from './dto/prediction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('predictions')
@Controller('predictions')
export class PredictionsController {
constructor(private predictionsService: PredictionsService) {}

@Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Record prediction setelah bet on-chain' })
recordPrediction(
@CurrentUser() user: any,
@Body() dto: RecordPredictionDto,
) {
return this.predictionsService.recordPrediction(
user.id,
dto.marketId,
dto.poolId,
dto.stakeAmount,
dto.txHash,
);
}

@Post('claim')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Record claim setelah claim on-chain' })
recordClaim(
@CurrentUser() user: any,
@Body() dto: RecordClaimDto,
) {
return this.predictionsService.recordClaim(user.id, dto.marketId, dto.txHash);
}

@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Prediction history user' })
getMyPredictions(
@CurrentUser() user: any,
@Query('limit') limit = 20,
@Query('offset') offset = 0,
) {
return this.predictionsService.getUserPredictions(user.id, +limit, +offset);
}

@Get('address/:address')
@ApiOperation({ summary: 'Prediction history publik by wallet address' })
getPublicPredictions(
@Param('address') address: string,
@Query('limit') limit = 20,
@Query('offset') offset = 0,
) {
return this.predictionsService.getPublicPredictions(address, +limit, +offset);
}

@Get('claim-status/:marketId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Cek claim status untuk market tertentu' })
getClaimStatus(
@CurrentUser() user: any,
@Param('marketId') marketId: string,
) {
return this.predictionsService.getClaimStatus(user.id, marketId);
}
}

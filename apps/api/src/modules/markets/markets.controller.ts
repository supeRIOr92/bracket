import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketsService } from './markets.service';

@ApiTags('markets')
@Controller('markets')
export class MarketsController {
  constructor(private marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: 'List semua market aktif' })
  getActiveMarkets() {
    return this.marketsService.getActiveMarkets();
  }

  @Get('today')
  @ApiOperation({ summary: 'Market aktif hari ini' })
  getTodayMarket() {
    return this.marketsService.getTodayMarket();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail market by ID' })
  getMarket(@Param('id') id: string) {
    return this.marketsService.getMarketById(id);
  }

  @Get(':id/pools')
  @ApiOperation({ summary: 'Pool distribution + estimated payout' })
  getPoolDistribution(@Param('id') id: string) {
    return this.marketsService.getPoolDistribution(id);
  }
}
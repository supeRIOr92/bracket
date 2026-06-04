import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketsService } from './markets.service';

@ApiTags('markets')
@Controller('markets')
export class MarketsController {
  constructor(private marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: 'Semua market aktif' })
  getActiveMarkets() {
    return this.marketsService.getActiveMarkets();
  }

  @Get('today')
  @ApiOperation({ summary: 'Market hari ini' })
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

  @Get('yesterday/winners')
  @ApiOperation({ summary: 'Daftar pemenang market kemarin' })
  getYesterdayWinners() {
    return this.marketsService.getYesterdayWinners();
  }

  @Post('create-today')
  @ApiOperation({ summary: 'Manual trigger: buat market hari ini (testing)' })
  createTodayMarket() {
    return this.marketsService.createTodayMarketManual();
  }
}

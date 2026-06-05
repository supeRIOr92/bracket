import { Controller, Get, Param } from '@nestjs/common';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
export class SeasonsController {
constructor(private readonly seasonsService: SeasonsService) {}

@Get('current')
getCurrentSeason() {
return this.seasonsService.getCurrentSeason();
}

@Get(':id/rankings')
getSeasonRankings(@Param('id') id: string) {
return this.seasonsService.getSeasonRankings(id);
}
}

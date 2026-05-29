import { IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordPredictionDto {
@ApiProperty()
@IsString()
@IsNotEmpty()
marketId: string;

@ApiProperty({ minimum: 1, maximum: 5 })
@IsNumber()
@Min(1)
@Max(5)
poolId: number;

@ApiProperty({ minimum: 5 })
@IsNumber()
@Min(5)
stakeAmount: number;

@ApiProperty()
@IsString()
@IsNotEmpty()
txHash: string;
}

export class RecordClaimDto {
@ApiProperty()
@IsString()
@IsNotEmpty()
marketId: string;

@ApiProperty()
@IsString()
@IsNotEmpty()
txHash: string;
}

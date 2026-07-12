import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateIncidentDto {
  @IsUUID('7')
  clientRequestId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(3_000)
  originalMessage!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressReference?: string;
}

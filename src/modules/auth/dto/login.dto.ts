import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);
export class LoginDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe contener exactamente 8 dígitos' })
  dni!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

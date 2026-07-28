import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

const normalizeString = ({ value }: TransformFnParams) => {
  const input: unknown = value;

  if (typeof input !== 'string') {
    return input;
  }

  const str = input.trim().toLowerCase();

  return str === '' ? null : str;
};

export class CreateUserDto {
  @Transform(trim)
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(60, { message: 'El nombre no debe superar 60 caracteres' })
  name!: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto' })
  @MaxLength(100, { message: 'El apellido no debe superar 100 caracteres' })
  lastName?: string;

  @Transform(trim)
  @IsString({ message: 'El DNI debe ser texto' })
  @IsNotEmpty({ message: 'El DNI no puede estar vacío' })
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni!: string;

  @Transform(normalizeString)
  @IsOptional()
  @Matches(/^\d{9}$/, {
    message: 'El teléfono debe tener 9 dígitos',
  })
  phone?: string;

  @Transform(normalizeString)
  @IsOptional()
  @MaxLength(100, { message: 'El correo no debe superar 100 caracteres' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email?: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña es demasiado larga' })
  password!: string;
}

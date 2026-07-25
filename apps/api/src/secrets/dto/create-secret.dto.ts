import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateIf,
  ValidateBy,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const CONTENT_MAX_LENGTH = 1_048_576; // 1MB
export const MAX_VIEWS_CAP = 1000;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function isFutureDate(value: unknown): boolean {
  if (value == null || value === '') return true;
  const date = new Date(value as string);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

const IsFutureDate = () =>
  ValidateBy({
    name: 'isFutureDate',
    validator: {
      validate: isFutureDate,
      defaultMessage: () => 'expiresAt must be a future date',
    },
  });

export function isStrongPassword(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value;
  if (s.length < PASSWORD_MIN_LENGTH || s.length > PASSWORD_MAX_LENGTH)
    return false;
  if (!/[a-z]/.test(s)) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/'`~]/.test(s)) return false;
  return true;
}

const IsStrongPassword = () =>
  ValidateBy({
    name: 'isStrongPassword',
    validator: {
      validate: isStrongPassword,
      defaultMessage: () =>
        `password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters with at least one lowercase, one uppercase, one digit, and one symbol`,
    },
  });

export class CreateSecretDto {
  @IsString()
  @IsNotEmpty({ message: 'content must not be empty' })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(CONTENT_MAX_LENGTH, {
    message: `content must not exceed ${CONTENT_MAX_LENGTH} characters`,
  })
  content!: string;

  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  @ValidateIf((_o, v) => v != null && v !== '')
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'maxViews must be at least 1' })
  @Max(MAX_VIEWS_CAP, { message: `maxViews must not exceed ${MAX_VIEWS_CAP}` })
  @Transform(({ value }: { value: unknown }): unknown =>
    value != null ? Number(value) : value,
  )
  maxViews?: number;

  @IsOptional()
  @IsString()
  @ValidateIf((_o, v) => v != null && v !== '')
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
  })
  @IsStrongPassword()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  password?: string;
}

import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  MinLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CONTENT_MAX_LENGTH,
  MAX_VIEWS_CAP,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isFutureDate,
  isStrongPassword,
} from './create-note.dto';

const IsFutureDate = () =>
  ValidateBy({
    name: 'isFutureDate',
    validator: {
      validate: isFutureDate,
      defaultMessage: () => 'expiresAt must be a future date',
    },
  });

const IsStrongPassword = () =>
  ValidateBy({
    name: 'isStrongPassword',
    validator: {
      validate: isStrongPassword,
      defaultMessage: () =>
        `password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters with at least one lowercase, one uppercase, one digit, and one symbol`,
    },
  });

/** Form fields for `POST /s/multipart` (same semantics as JSON create + optional attachment metadata). */
export class CreateMultipartNoteDto {
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

  /** Required when a file is uploaded on the client-ciphertext path (multer may report octet-stream). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  attachmentMimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  attachmentFileName?: string;
}

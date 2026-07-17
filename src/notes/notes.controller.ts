import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  ForbiddenException,
  NotFoundException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateMultipartNoteDto } from './dto/create-multipart-note.dto';
import { RateLimitGuard } from '../redis/rate-limit.guard';
import { NotesService } from './notes.service';
import { MULTIPART_FILE_FIELD_MAX_BYTES } from './attachment.constants';

const NOTE_PASSWORD_HEADER = 'x-note-password';

function getPublicAppUrl(): string {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
  return process.env.NODE_ENV === 'production'
    ? 'https://1note.xyz'
    : 'http://localhost:5173';
}
const PUBLIC_APP_URL = getPublicAppUrl();

@Controller('s')
@UseGuards(RateLimitGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(@Body() dto: CreateNoteDto) {
    const note = await this.notesService.create(dto);
    const url = `${PUBLIC_APP_URL.replace(/\/$/, '')}/s/${note.slug}`;
    return {
      slug: note.slug,
      url,
      expiresAt: note.expiresAt?.toISOString() ?? null,
      maxViews: note.maxViews ?? null,
    };
  }

  @Post('multipart')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MULTIPART_FILE_FIELD_MAX_BYTES },
    }),
  )
  async createNoteMultipart(
    @Body() dto: CreateMultipartNoteDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const note = await this.notesService.createMultipart(dto, file);
    const url = `${PUBLIC_APP_URL.replace(/\/$/, '')}/s/${note.slug}`;
    return {
      slug: note.slug,
      url,
      expiresAt: note.expiresAt?.toISOString() ?? null,
      maxViews: note.maxViews ?? null,
    };
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  async readNote(
    @Param('slug') slug: string,
    @Headers(NOTE_PASSWORD_HEADER) password?: string,
  ) {
    const result = await this.notesService.readBySlug(
      slug,
      password?.trim() || undefined,
    );

    if (result === null) {
      throw new NotFoundException();
    }

    if (!result.success) {
      if (result.code === 'WRONG_PASSWORD_LIMIT') {
        throw new HttpException(
          {
            code: result.code,
            message:
              'Too many wrong passphrase attempts. Try again in 15 minutes.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new ForbiddenException({
        code: result.code,
        message:
          result.code === 'PASSWORD_REQUIRED'
            ? 'This note is protected. Provide the passphrase in the X-Note-Password header.'
            : 'Invalid passphrase.',
      });
    }

    return {
      payloadMode: result.payloadMode,
      content: result.content,
      attachment: result.attachment,
    };
  }
}

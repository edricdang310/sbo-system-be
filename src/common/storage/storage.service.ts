import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export interface StoredFile {
  name: string;
  /** MIME type */
  type: string;
  url: string;
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Filesystem storage for payment proofs (UNC / receipts). Returns absolute public URLs. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly dir: string;
  private readonly publicUrl: string;
  private readonly maxBytes: number;

  constructor(config: ConfigService) {
    this.dir = resolve(config.get<string>('app.uploadDir'));
    this.publicUrl = config.get<string>('app.publicUrl');
    this.maxBytes = config.get<number>('app.maxUploadMb') * 1024 * 1024;
  }

  /**
   * Accepts a data URL (new upload) or a URL we already issued (kept as-is).
   * Anything else is rejected so clients cannot inject arbitrary links.
   */
  async saveAttachment(input: { name: string; type?: string; url: string }, folder = 'payments'): Promise<StoredFile> {
    const url = input?.url ?? '';
    if (url.startsWith(`${this.publicUrl}/uploads/`)) {
      return { name: input.name, type: input.type ?? '', url };
    }
    const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(url);
    if (!match) throw new BadRequestException('Tệp đính kèm không hợp lệ (cần data URL base64)');

    const [, mime, b64] = match;
    const ext = EXT[mime];
    if (!ext) throw new BadRequestException('Chỉ chấp nhận ảnh (png, jpg, webp, gif) hoặc PDF');
    const buffer = Buffer.from(b64, 'base64');
    if (buffer.length === 0 || buffer.length > this.maxBytes) {
      throw new BadRequestException(`Tệp vượt quá ${Math.round(this.maxBytes / 1024 / 1024)}MB hoặc rỗng`);
    }

    const filename = `${randomUUID()}.${ext}`;
    const target = join(this.dir, folder);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(join(target, filename), buffer);
    return { name: (input.name || filename).slice(0, 200), type: mime, url: `${this.publicUrl}/uploads/${folder}/${filename}` };
  }

  async remove(url?: string) {
    if (!url?.startsWith(`${this.publicUrl}/uploads/`)) return;
    const relative = url.slice(`${this.publicUrl}/uploads/`.length);
    const file = resolve(this.dir, relative);
    if (!file.startsWith(this.dir)) return; // path traversal guard
    await fs.unlink(file).catch((e) => this.logger.warn(`Cannot delete ${file}: ${e.message}`));
  }

  get uploadDir() {
    return this.dir;
  }
}

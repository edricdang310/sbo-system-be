import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';

/** AES-256-GCM for secrets at rest (Telegram bot token, Gemini API key) */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = createHash('sha256').update(config.get<string>('app.secretKey') ?? '').digest();
  }

  encrypt(plain: string): string {
    if (!plain) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return PREFIX + [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join(':');
  }

  decrypt(stored: string): string {
    if (!stored) return '';
    if (!stored.startsWith(PREFIX)) return stored;
    try {
      const [iv, tag, data] = stored.slice(PREFIX.length).split(':').map((s) => Buffer.from(s, 'base64'));
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }

  /** Value shown to the frontend; never the real secret */
  mask(plain: string): string {
    if (!plain) return '';
    return `${'•'.repeat(8)}${plain.slice(-4)}`;
  }

  isMasked(value?: string): boolean {
    return !!value && value.startsWith('•');
  }
}

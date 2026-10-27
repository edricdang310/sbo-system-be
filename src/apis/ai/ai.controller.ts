import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
@ApiTags('ai')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly service: AiService) {}

  /** Rate limited: each call costs money on the Gemini account */
  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  chat(@Body() body: ChatDto, @CurrentUser() user: AuthUser) {
    return this.service.chat(body, user);
  }
}

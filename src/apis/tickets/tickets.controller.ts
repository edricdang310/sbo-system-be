import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PERMISSION } from 'src/common/enum';
import { AuthUser } from 'src/common/interfaces/auth.interface';
import { TicketsService } from './tickets.service';
import { AddCommentDto, CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';

@Controller('tickets')
@ApiTags('tickets')
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get()
  @Roles(PERMISSION.TICKET_VIEW)
  findAll() {
    return this.service.list();
  }

  @Post()
  @Roles(PERMISSION.TICKET_CREATE)
  create(@Body() body: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.service.createTicket(body, user);
  }

  @Patch(':id')
  @Roles(PERMISSION.TICKET_HANDLE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateTicketDto, @CurrentUser() user: AuthUser) {
    return this.service.updateTicket(id, body, user);
  }

  @Post(':id/comments')
  @Roles(PERMISSION.TICKET_VIEW)
  addComment(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddCommentDto, @CurrentUser() user: AuthUser) {
    return this.service.addComment(id, body.content, user);
  }

  /** Administrators only (user:manage is held by admin alone) */
  @Delete(':id')
  @Roles(PERMISSION.USER_MANAGE)
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.removeTicket(id, user);
  }
}

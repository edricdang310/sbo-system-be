import { Module } from '@nestjs/common';
import { UsersModule } from 'src/apis/users/users.module';
import { SeedingService } from './services/seeding.service';

@Module({
  imports: [UsersModule],
  providers: [SeedingService],
})
export class SeedingModule {}

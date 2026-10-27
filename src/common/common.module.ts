import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseOptionsService } from './database/services/database.options.service';
import { Sequence } from './sequence/entities/sequence.entity';
import { SequenceService } from './sequence/sequence.service';
import { CryptoService } from './crypto/crypto.service';
import { StorageService } from './storage/storage.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useClass: DatabaseOptionsService }),
    TypeOrmModule.forFeature([Sequence]),
  ],
  providers: [SequenceService, CryptoService, StorageService],
  exports: [SequenceService, CryptoService, StorageService],
})
export class CommonModule {}

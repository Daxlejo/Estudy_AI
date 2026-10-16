import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialStorageService } from './material-storage.service';
import { TextExtractionService } from './text-extraction.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MaterialsController],
  providers: [MaterialsService, MaterialStorageService, TextExtractionService],
  exports: [MaterialsService, TextExtractionService],
})
export class MaterialsModule {}

import {
  Controller,
  InternalServerErrorException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  MaterialsService,
  UploadedMaterialFile,
  getMaxMaterialBytes,
} from './materials.service';
import { MaterialResponseDto } from './dto/material-response.dto';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('courses/:id/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  private handleError(error: unknown): never {
    if (error instanceof DatabaseError) {
      throw new InternalServerErrorException('A database error occurred');
    }
    throw error;
  }

  @Post()
  @UseInterceptors(
    // Sin `dest`, multer conserva el archivo en memoria (file.buffer).
    FileInterceptor('file', {
      limits: { fileSize: getMaxMaterialBytes(), files: 1 },
    }),
  )
  async upload(
    @Param('id') courseId: string,
    @UploadedFile() file: UploadedMaterialFile | undefined,
    @CurrentUser() user?: CurrentUserPayload,
  ): Promise<MaterialResponseDto> {
    try {
      return await this.materialsService.upload(courseId, file, user?.sub);
    } catch (e) {
      this.handleError(e);
    }
  }
}

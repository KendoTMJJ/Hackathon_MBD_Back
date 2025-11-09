import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { DocumentsModule } from '../documents/documents.module';
import { Template } from 'src/entities/template/template';

@Module({
  imports: [TypeOrmModule.forFeature([Template]), DocumentsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

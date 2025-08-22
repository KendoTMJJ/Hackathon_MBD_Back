import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document } from 'src/entities/document/document';
@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

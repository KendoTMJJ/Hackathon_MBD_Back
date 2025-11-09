import { Module } from '@nestjs/common';

import { DocumentsModule } from 'src/diagrams/documents/documents.module';
import { DiagramsModule } from 'src/diagrams/diagrams.module';
import { ConexionTestModule } from './conexion-test.module';
import { TechnologiesModule } from 'src/diagrams/tecnologies/technologies.module';

@Module({
  imports: [
    ConexionTestModule,
    DiagramsModule,
    DocumentsModule,
    TechnologiesModule,
  ],
})
export class AppTestModule {}

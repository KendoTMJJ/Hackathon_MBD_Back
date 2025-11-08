import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Technology } from 'src/entities/tecnologie/tecnology';
import { TecnologiesService } from './tecnologies.service';
import { TecnologiesController } from './tecnologies.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Technology])],
  providers: [TecnologiesService],
  controllers: [TecnologiesController],
})
export class TecnologiesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Technology } from 'src/entities/tecnologie/tecnology';
import { TechnologiesService } from './technologies.service';
import { TechnologiesController } from './technologies.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Technology])],
  providers: [TechnologiesService],
  controllers: [TechnologiesController],
})
export class TechnologiesModule {}

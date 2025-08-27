import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tecnologie } from 'src/entities/tecnologie/tecnologie';
import { TecnologiesService } from './tecnologies.service';
import { TecnologiesController } from './tecnologies.controller';
@Module({
    imports: [TypeOrmModule.forFeature([Tecnologie])],
    providers: [TecnologiesService],
    controllers: [TecnologiesController],
})
export class TecnologiesModule {}

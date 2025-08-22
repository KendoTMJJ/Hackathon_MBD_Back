import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { DiagramsModule } from './diagrams/diagrams.module';
import { AuthModule } from './auth/auth.module';
import { ConexionModule } from './config/conexion/conexion.module';
import { TecnologiesModule } from './diagrams/tecnologies/tecnologies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    DiagramsModule,
    AuthModule,
    ConexionModule,
    TecnologiesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

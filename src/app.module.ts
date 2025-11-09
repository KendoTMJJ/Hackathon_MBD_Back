import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { DiagramsModule } from './diagrams/diagrams.module';
import { AuthModule } from './auth/auth.module';
import { ConexionModule } from './config/conexion/conexion.module';
import { ConexionTestModule } from './app-test/conexion-test.module';
import { AppTestModule } from './app-test/app-test.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    DiagramsModule,
    AuthModule,
    ConexionModule,
    ConexionTestModule,
    AppTestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

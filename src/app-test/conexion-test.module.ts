import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { Document } from 'src/entities/document/document';
import { Project } from 'src/entities/project/project';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { Sheet } from 'src/entities/sheet/sheet';
import { Snapshot } from 'src/entities/snapshot/snapshot';
import { Technology } from 'src/entities/tecnologie/tecnology';
import { Template } from 'src/entities/template/template';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: process.env.DB_HOST_TEST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER_TEST || 'user_node',
        password: process.env.DB_PASS_TEST || '123456',
        database: process.env.DB_NAME_TEST || 'bd_hackathon_test',
        namingStrategy: new SnakeNamingStrategy(),
        entities: [
          Collaborator,
          Document,
          Technology,
          Project,
          Snapshot,
          Template,
          ShareLink,
          Sheet,
        ],
        synchronize: true,
        dropSchema: true,
        logging: false,
      }),
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options!);
        try {
          await dataSource.initialize();
          console.log('✅ Conexión establecida con la BD de pruebas');
          return dataSource;
        } catch (error) {
          console.error(
            '❌ Error al conectar con la BD de pruebas:',
            error.message,
          );
          throw error;
        }
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class ConexionTestModule {}

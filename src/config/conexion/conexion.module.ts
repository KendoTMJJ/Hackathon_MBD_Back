import { Global, Module } from '@nestjs/common';
import { share } from 'rxjs';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { Document } from 'src/entities/document/document';
import { Project } from 'src/entities/project/project';
import { SharedLink } from 'src/entities/shared-link/shared-link';
import { Sheet } from 'src/entities/sheet/sheet';
import { Snapshot } from 'src/entities/snapshot/snapshot';
import { Tecnologie } from 'src/entities/tecnologie/tecnologie';
import { Template } from 'src/entities/template/template';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: DataSource,
      inject: [],
      useFactory: async () => {
        try {
          const poolConection = new DataSource({
            type: 'postgres',
            host: String(process.env.DB_HOST),
            port: Number(process.env.DB_PORT),
            username: String(process.env.DB_USER),
            database: String(process.env.DB_NAME),
            password: String(process.env.DB_PASS),
            synchronize: true,
            logging: true,
            namingStrategy: new SnakeNamingStrategy(),
            entities: [
              Project,
              Document,
              Collaborator,
              Snapshot,
              Template,
              SharedLink,
              Sheet,
              Tecnologie,
            ],
          });

          await poolConection.initialize();
          console.log('Conexion establecida con la bd: ' + 'bd_hackathon');
          return poolConection;
        } catch (error) {
          console.log('Fallo al realizar la conexion de la bd');
          throw error;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class ConexionModule {}

import { Global, Module } from '@nestjs/common';
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

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: DataSource,

      // This factory initializes the TypeORM DataSource and makes it globally available
      useFactory: async () => {
        try {
          const poolConnection = new DataSource({
            type: 'postgres',
            host: String(process.env.DB_HOST),
            port: Number(process.env.DB_PORT),
            username: String(process.env.DB_USER),
            database: String(process.env.DB_NAME),
            password: String(process.env.DB_PASS),

            // NOTE: Only use synchronize: true in development.
            synchronize: true,
            logging: true,

            // Converts table/column naming to snake_case automatically
            namingStrategy: new SnakeNamingStrategy(),

            entities: [
              Project,
              Document,
              Collaborator,
              Snapshot,
              Template,
              ShareLink,
              Sheet,
              Technology,
            ],

            // Set to true if your PostgreSQL requires SSL (e.g., cloud providers)
            ssl: false,
          });

          await poolConnection.initialize();
          console.log('Database connection established: bd_hackathon');

          return poolConnection;
        } catch (error) {
          console.error('Failed to establish database connection');
          throw error;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class ConexionModule {}

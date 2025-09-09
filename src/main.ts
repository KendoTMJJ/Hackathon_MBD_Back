import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  let port: number = Number(process.env.PORT);

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.enableCors({
    origin: ['http://localhost:5173'], // 👈 nada de '*'
    credentials: true, // 👈 permite cookies
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-shared-password', // 👈 tu header custom para password
    ],
  });

  app.use((req, _res, next) => {
    if (req.path.startsWith('/projects')) {
      console.log(
        '[REQ]',
        req.method,
        req.path,
        'auth=',
        req.headers.authorization?.slice(0, 30),
      );
    }
    next();
  });

  await app.listen(port, () => {
    console.log('servidor funcionando en el puerto: ' + port);
  });
}
bootstrap();

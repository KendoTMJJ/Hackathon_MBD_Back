import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  let port: number = Number(process.env.PORT);

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.enableCors();

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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // -- REST API Configuration --
  app.setGlobalPrefix('api');

  // -- Enable CORS for local desktop frontend --
  app.enableCors({
    origin: '*', // We can restrict this later to the local frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // -- Global Validation --
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // -- Centralized Error Handling --
  // app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

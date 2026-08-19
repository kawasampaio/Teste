import 'reflect-metadata';

import {
  ValidationPipe,
} from '@nestjs/common';

import {
  NestFactory,
} from '@nestjs/core';

import {
  AppModule,
} from './app.module';

async function bootstrap(): Promise<void> {
  const app =
    await NestFactory.create(
      AppModule,
    );

  app.enableShutdownHooks();

  app.enableCors({
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      /*
       * Só permite propriedades declaradas
       * no DTO.
       */
      whitelist: true,

      /*
       * Em vez de simplesmente remover
       * campos extras, retorna 400.
       */
      forbidNonWhitelisted: true,

      /*
       * Transforma o objeto recebido
       * na classe DTO.
       */
      transform: true,
    }),
  );

  const port =
    process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(
    `Application running on http://localhost:${port}`,
  );
}

void bootstrap();
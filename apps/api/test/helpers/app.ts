import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';

export async function createTestApp(overrides?: (module: TestingModuleBuilderLike) => void): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (overrides) {
    overrides(builder as unknown as TestingModuleBuilderLike);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('v1', {
    exclude: ['health', 'api/docs', 'api/docs-json'],
  });

  await app.init();
  return app;
}

type TestingModuleBuilderLike = {
  overrideProvider: (token: unknown) => {
    useValue: (value: unknown) => TestingModuleBuilderLike;
  };
};

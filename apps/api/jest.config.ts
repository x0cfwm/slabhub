import type { Config } from 'jest';

const common: Partial<Config> = {
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  restoreMocks: true,
  clearMocks: true,
  resetMocks: true,
};

const config: Config = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      rootDir: '.',
      setupFiles: ['<rootDir>/test/setup-env.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup-unit.ts'],
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts', '<rootDir>/src/**/*.unit.spec.ts'],
    },
    {
      ...common,
      displayName: 'integration',
      rootDir: '.',
      setupFiles: ['<rootDir>/test/setup-env.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup-int.ts'],
      globalSetup: '<rootDir>/test/global-setup.int.ts',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      maxWorkers: 1,
    },
  ],
  collectCoverageFrom: [
    '<rootDir>/src/modules/prisma/prisma.service.ts',
    '<rootDir>/test/mocks/prisma.mock.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverage: false,
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};

export default config;

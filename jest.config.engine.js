module.exports = {
  rootDir: __dirname,
  roots: [
    '<rootDir>/src/components/games/heist-city/engine',
    '<rootDir>/src/components/games/heist-city/ai',
    '<rootDir>/src/components/games/heist-city/hooks',
  ],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  testPathIgnorePatterns: ['/node_modules/'],
};

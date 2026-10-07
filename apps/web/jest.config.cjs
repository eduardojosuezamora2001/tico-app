/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  setupFiles: ["<rootDir>/src/test/polyfills.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    "^@/lib/env$": "<rootDir>/src/test/mocks/env.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@workspace/ui/(.*)$": "<rootDir>/../../packages/ui/src/$1",
    "^@workspace/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    // Shared TS sources import with .js extensions.
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^cn$": "<rootDir>/src/test/mocks/cn.ts",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
        diagnostics: { ignoreCodes: [1343] },
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  clearMocks: true,
  testTimeout: 15000,
  collectCoverageFrom: [
    "src/components/**/*.{ts,tsx}",
    "src/pages/**/*.{ts,tsx}",
    "src/lib/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/test/**",
  ],
}

module.exports = config

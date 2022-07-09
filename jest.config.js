module.exports = {
  displayName: "xstate-tree",
  testMatch: ["./**/?(*.)(spec|test|integration).ts?(x)"],
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost",
  },  
  setupFilesAfterEnv: ["./src/setupScript.ts"],
  globals: {
    "ts-jest": {
      tsConfig: "./tsconfig.json",
      isolatedModules: true,
    },
  },
  verbose: true,
  collectCoverage: Boolean(process.env.CI),
};

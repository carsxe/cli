module.exports = {
  root: true,
  extends: ["@carsxe/eslint-config"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "no-console": "off",
  },
  ignorePatterns: [".eslintrc.cjs"],
};

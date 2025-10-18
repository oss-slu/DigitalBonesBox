export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
      },
    },
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
  },
  // Safely ignore non-project folders.
  {
    ignores: [
      "node_modules/",
      "venv/",
      "coverage/",
      "dist/",
    ],
  }

];

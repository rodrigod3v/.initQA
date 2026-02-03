const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: "http://localhost:5173", // Frontend URL
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
  },
  env: {
    apiBaseUrl: "http://localhost:3000", // Backend API URL
  },
});

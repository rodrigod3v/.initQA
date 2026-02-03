// cypress/support/e2e.js
import './commands';

// Global configurations or hooks can be added here
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});

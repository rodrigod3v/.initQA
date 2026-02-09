// Custom commands for Cypress

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[type="email"]').should('be.visible').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('apiLogin', (email, password) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiBaseUrl')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    const token = response.body.access_token;
    localStorage.setItem('token', token);
    Cypress.env('auth_token', token); // Set in env for easier access in same-session requests
    return token;
  });
});

// Example of a command to clear local storage and cookies
Cypress.Commands.add('clearAppData', () => {
  localStorage.removeItem('token');
  cy.clearLocalStorage();
  cy.clearCookies();
});

class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillEmail(value) {
    cy.get('input[type="email"]').clear().type(value);
    return this;
  }

  fillPassword(value) {
    cy.get('input[type="password"]').clear().type(value);
    return this;
  }

  submit() {
    cy.get('button[type="submit"]').click();
  }

  errorMessage() {
    return cy.get('.error-message');
  }
}

export default new LoginPage();

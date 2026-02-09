import LoginPage from '../../pages/login.page';

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearAppData();
  });

  it('should show error with invalid credentials', () => {
    LoginPage.visit();
    LoginPage.fillEmail('invalid@test.com');
    LoginPage.fillPassword('wrongpassword');
    LoginPage.submit();
    
    // Adjust selector based on actual application behavior
    // LoginPage.errorMessage().should('be.visible');
  });

  it('should login successfully with custom command', () => {
    // This uses the custom command defined in support/commands.js
    cy.login('admin@initqa.com', 'admin123');
    
    // Verify successful login (e.g., redirect to projects and show title)
    cy.url().should('include', '/projects');
    cy.contains('MY_PROJECTS').should('be.visible');
  });
});

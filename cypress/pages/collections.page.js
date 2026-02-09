class CollectionsPage {
  // Navigation & Project/Env Selection
  selectProject(name) {
    cy.get('select').first().select(name);
  }

  selectEnvironment(name) {
    cy.contains('ENV:').parent().find('select').select(name);
  }

  // Collection Sidebar
  createRequest(name) {
    cy.get('button[aria-label="Create new request"]').click();
    cy.get('input[placeholder="GET_USER_DATA"]').type(name);
    cy.contains('CREATE_PROTOCOL').click();
  }

  selectRequest(name) {
    cy.contains('div', name).click();
  }

  deleteRequest(name) {
    cy.contains('div', name).within(() => {
      cy.get('button[title="Delete request"]').click({ force: true });
    });
    cy.contains('DELETE_PROTOCOL').click();
  }

  // Request Editor
  setProtocol(protocol) {
    // There are several selects in the page, the one for protocol is in the urlBar
    cy.get('select').contains('REST|GRAPHQL|GRPC', { matchCase: false }).parent().select(protocol);
  }

  setMethod(method) {
    cy.get('select').contains('GET|POST|PUT|DELETE|PATCH', { matchCase: false }).parent().select(method);
  }

  setUrl(url) {
    cy.get('input[placeholder*="api.example.com"]').clear().type(url);
  }

  setBody(jsonBody) {
    cy.contains('button', 'Data').click();
    // In many Monaco setups, typing in the textarea works if focused
    cy.get('.monaco-editor').first().find('textarea').first().focus().type('{ctrl+a}{backspace}', { force: true });
    cy.get('.monaco-editor').first().find('textarea').first().type(JSON.stringify(jsonBody, null, 2), { force: true, parseSpecialCharSequences: false });
  }

  setTestScript(script) {
    cy.contains('button', 'Functional').first().click();
    cy.get('.monaco-editor').eq(1).find('textarea').first().focus().type('{ctrl+a}{backspace}', { force: true });
    cy.get('.monaco-editor').eq(1).find('textarea').first().type(script, { force: true, parseSpecialCharSequences: false });
  }

  // Execution
  execute() {
    cy.contains('button', 'EXECUTE').should('not.be.disabled').click();
  }

  // Results Verification
  verifyStatus(status) {
    // Wait for execution to finish (loader might appear)
    cy.get('div').contains('EXECUTING_TEST', { timeout: 30000 }).should('not.exist');
    // The status badge has a specific class or structure. In the view it's S.latestExecutionStatus(Number(testResult.status))
    // It's inside resultsHeader.
    cy.contains('EXECUTION_LOGS').parent().parent().should('contain.text', status);
  }

  verifyResponseContains(text) {
    cy.contains('button', 'Response').click();
    // For verification, it's often better to check the entire editor's text content
    cy.get('.monaco-editor').last().should('contain.text', text);
  }

  verifyTestPass(testName) {
    cy.contains('button', 'Functional').last().click();
    cy.contains(testName).parent().find('svg.text-emerald-500').should('exist');
  }
}

export default new CollectionsPage();

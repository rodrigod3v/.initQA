class WebScenariosPage {
  // Scenario Management
  createScenario(name) {
    cy.contains('SCENARIOS').parent().find('button').click();
    cy.get('input[placeholder*="AUTH_FLOW"]').should('be.visible').type(name);
    cy.contains('button', 'CREATE_SCENARIO').click();
  }

  selectScenario(name) {
    cy.contains('span', name).click();
  }

  deleteScenario(name) {
    cy.contains('div', name).within(() => {
      cy.get('button').find('svg').parent().filter(':has(path[d*="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"])').click({ force: true }); // Trash icon
    });
    cy.contains('button', 'CONFIRM_DELETE').click();
  }

  // Script Editing
  openScriptMode() {
    cy.contains('button', 'SCRIPT_MODE').click();
  }

  applyScript(jsonSteps) {
    cy.get('textarea').should('be.visible').focus().clear({ force: true });
    cy.get('textarea').type(JSON.stringify(jsonSteps, null, 2), { force: true, parseSpecialCharSequences: false, delay: 0 });
    cy.contains('button', 'Apply Changes').click({ force: true });
    
    // Wait for the modal to close
    cy.get('textarea', { timeout: 10000 }).should('not.exist');
    
    // CRITICAL: Wait for the persistence badge to show "Steps Persisted"
    // This ensures the backend has the data before we click RUN
    cy.contains('Steps Persisted', { timeout: 10000 }).should('be.visible');
  }

  // Execution
  execute() {
    cy.contains('button', 'RUN_TEST').click();
  }

  // Verification
  verifyStatus(status) {
    // Wait for the execution overlay to disappear (execution finished)
    cy.contains('SPOOLING_BROWSER', { timeout: 60000 }).should('not.exist');
    
    // Check if it failed instead of succeeded
    cy.get('body').then(($body) => {
      if ($body.text().includes('STATUS_FAILED') && status === 'SUCCESS') {
        throw new Error('Web Scenario execution FAILED on the backend. Check results tab for logs.');
      }
    });

    // Find the status indicator
    cy.contains(`STATUS_${status}`, { timeout: 15000 }).should('be.visible');
  }

  verifyTimelineContains(text) {
    cy.get('div').contains('EXECUTION_TIMELINE').parent().should('contain.text', text);
  }

  verifyFinalStateScreenshot() {
    cy.get('img[alt="Visual Proof"]').should('be.visible');
  }
}

export default new WebScenariosPage();

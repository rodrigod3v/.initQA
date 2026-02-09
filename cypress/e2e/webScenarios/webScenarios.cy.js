import WebScenariosPage from '../../pages/webScenarios.page';

describe('Web Scenarios Feature', () => {
  let projectId;

  Cypress.on('window:alert', (text) => {
    console.warn('UI Alert detected:', text);
  });

  before(() => {
    cy.apiLogin('admin@initqa.com', 'admin123').then((token) => {
      // Ensure we have a project via API
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiBaseUrl')}/projects`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((response) => {
        if (response.body.length === 0) {
          return cy.request({
            method: 'POST',
            url: `${Cypress.env('apiBaseUrl')}/projects`,
            body: { name: 'WEB_AUTOMATION_PROJECT' },
            headers: { Authorization: `Bearer ${token}` }
          }).then((postResponse) => {
            projectId = postResponse.body.id;
          });
        } else {
          projectId = response.body[0].id;
        }
      });
    }).then(() => {
      // Navigate directly to the Web Scenarios page for this project
      cy.visit(`/projects/${projectId}/web`);
      cy.get('body', { timeout: 15000 }).should('be.visible');
    });
  });

  it('should create, edit, run and delete a web scenario', () => {
    const scenarioName = `CY_WEB_TEST_${Date.now()}`;
    
    // 1. Create
    cy.log('Creating scenario...');
    WebScenariosPage.createScenario(scenarioName);
    cy.contains('span', scenarioName, { timeout: 10000 }).should('be.visible');

    // 2. Edit (Script Mode)
    cy.log('Editing script...');
    WebScenariosPage.selectScenario(scenarioName);
    WebScenariosPage.openScriptMode();
    const testSteps = [
      { type: 'GOTO', value: 'https://example.com' },
      { type: 'ASSERT_VISIBLE', selector: 'h1' },
      { type: 'ASSERT_TEXT', selector: 'h1', value: 'Example Domain' }
    ];
    WebScenariosPage.applyScript(testSteps);

    // 3. Execute
    cy.log('Executing test...');
    WebScenariosPage.execute();
    
    // 4. Verify
    cy.log('Verifying results...');
    WebScenariosPage.verifyStatus('SUCCESS');
    WebScenariosPage.verifyTimelineContains('GOTO_URL');
    WebScenariosPage.verifyFinalStateScreenshot();

    // 5. Delete
    cy.log('Deleting scenario...');
    WebScenariosPage.deleteScenario(scenarioName);
    cy.contains(scenarioName).should('not.exist');
  });
});

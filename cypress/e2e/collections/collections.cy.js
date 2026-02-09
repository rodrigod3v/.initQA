import CollectionsPage from '../../pages/collections.page';

describe('Collections Feature', () => {
  before(() => {
    cy.apiLogin('admin@initqa.com', 'admin123');
    
    // Visit home first to ensure storage is active
    cy.visit('/');
    
    // Check if we have projects, if not create one
    cy.visit('/projects');
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Explicit wait for the projects list or empty state to be determined
    cy.get('body').then(($body) => {
      if ($body.find('a[href*="/projects/"]').length === 0) {
        cy.contains('button', 'Create_Project').click();
        cy.get('input').eq(0).type('QA_AUTOMATION_PROJECT'); // More generic if label fails
        cy.contains('button', 'Create_Project').click();
        cy.wait(1000); // Wait for animation
      }
      cy.get('a[href*="/projects/"]').first().click();
    });

    // Navigate to Http Request page (Collections view)
    cy.contains('HTTP Requests', { timeout: 10000 }).should('be.visible').click();
    cy.url({ timeout: 10000 }).should('include', '/requests');
  });

  describe('REST Protocol', () => {
    it('should execute a GET request', () => {
      CollectionsPage.createRequest('REST_GET_TEST');
      CollectionsPage.selectRequest('REST_GET_TEST');
      CollectionsPage.setProtocol('REST');
      CollectionsPage.setMethod('GET');
      CollectionsPage.setUrl('https://jsonplaceholder.typicode.com/posts/1');
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(200);
      CollectionsPage.verifyResponseContains('sunt aut facere');
    });

    it('should execute a POST request', () => {
      CollectionsPage.createRequest('REST_POST_TEST');
      CollectionsPage.selectRequest('REST_POST_TEST');
      CollectionsPage.setMethod('POST');
      CollectionsPage.setUrl('https://jsonplaceholder.typicode.com/posts');
      CollectionsPage.setBody({
        title: 'foo',
        body: 'bar',
        userId: 1
      });
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(201);
      CollectionsPage.verifyResponseContains('foo');
    });

    it('should execute a PUT request', () => {
      CollectionsPage.createRequest('REST_PUT_TEST');
      CollectionsPage.selectRequest('REST_PUT_TEST');
      CollectionsPage.setMethod('PUT');
      CollectionsPage.setUrl('https://jsonplaceholder.typicode.com/posts/1');
      CollectionsPage.setBody({
        id: 1,
        title: 'updated title',
        body: 'updated body',
        userId: 1
      });
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(200);
      CollectionsPage.verifyResponseContains('updated title');
    });

    it('should execute a DELETE request', () => {
      CollectionsPage.createRequest('REST_DELETE_TEST');
      CollectionsPage.selectRequest('REST_DELETE_TEST');
      CollectionsPage.setMethod('DELETE');
      CollectionsPage.setUrl('https://jsonplaceholder.typicode.com/posts/1');
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(200);
    });

    it('should execute a PATCH request', () => {
      CollectionsPage.createRequest('REST_PATCH_TEST');
      CollectionsPage.selectRequest('REST_PATCH_TEST');
      CollectionsPage.setMethod('PATCH');
      CollectionsPage.setUrl('https://jsonplaceholder.typicode.com/posts/1');
      CollectionsPage.setBody({
        title: 'patched title'
      });
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(200);
      CollectionsPage.verifyResponseContains('patched title');
    });
  });

  describe('GraphQL Protocol', () => {
    it('should execute a GraphQL Query', () => {
      CollectionsPage.createRequest('GQL_QUERY_TEST');
      CollectionsPage.selectRequest('GQL_QUERY_TEST');
      CollectionsPage.setProtocol('GRAPHQL');
      CollectionsPage.setUrl('https://countries.trevorblades.com/');
      CollectionsPage.setBody({
        query: '{ country(code: "BR") { name capital currency } }'
      });
      CollectionsPage.execute();
      CollectionsPage.verifyStatus(200);
      CollectionsPage.verifyResponseContains('Brazil');
    });
  });

  describe('Collection Management', () => {
    it('should delete a request from the collection', () => {
      const reqName = 'TEMP_REQ_TO_DELETE';
      CollectionsPage.createRequest(reqName);
      cy.contains(reqName).should('be.visible');
      CollectionsPage.deleteRequest(reqName);
      cy.contains(reqName).should('not.exist');
    });
  });
});

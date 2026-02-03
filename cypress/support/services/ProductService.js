// cypress/support/services/ProductService.js

class ProductService {
  getProducts() {
    return cy.request({
      method: 'GET',
      url: `${Cypress.env('apiBaseUrl')}/products`,
      failOnStatusCode: false
    });
  }

  createProduct(data) {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('apiBaseUrl')}/products`,
      body: data,
      failOnStatusCode: false
    });
  }
}

export default new ProductService();

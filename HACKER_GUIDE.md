# 💀 .initQA — Hacker Mode Guide

Bem-vindo ao terminal de comando do **.initQA**. Este guia detalha como operar esta ferramenta de alta performance para testes de API.

## 🚀 Operações Básicas

### 1. Criando um Nodo (Request)
- Clique no ícone `+` no painel **DIR_SCAN**.
- Dê um identificador único (ex: `AUTH_LOGIN`).
- Selecione o método (GET, POST, etc) e insira a URL completa (ou use variáveis).

### 2. Payload & Nodes (Headers)
- **Payload:** Insira o corpo da requisição em formato JSON.
- **Nodes:** Insira seus headers (ex: `Content-Type`, `Authorization`).
- **Dica:** O sistema detecta automaticamente se o JSON está válido antes de enviar.

---

## ⚡ Automação e Validação

### 3. Contract (JSON Schema)
Defina a estrutura esperada da resposta para garantir integridade automática.
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string" },
    "id": { "type": "number" }
  },
  "required": ["status"]
}
```
*Se a API mudar a estrutura, o terminal mostrará um badge vermelho de falha.*

### 4. Scripts de Teste (Assertion Engine)
Use a aba **Tests** para criar validações lógicas complexas usando JavaScript.
```javascript
// Exemplo de teste rápido
pm.test("Status é 200", () => pm.response.to.have.status(200));

// Exemplo de lógica de dados
pm.test("Token foi retornado", () => {
    const data = pm.response.data;
    pm.expect(data.token).to.be.a("string");
});
```

---

## 🌍 Gerenciamento de Contexto

### 5. Ambientes (Environments)
- Crie variáveis usando o ícone `+` ao lado do seletor de ambiente.
- Use `{{MINHA_VAR}}` em qualquer campo (URL, Body, Headers).
- O sistema injetará o valor do ambiente selecionado em tempo de execução.

### 6. Diff Analyzer
- Use a barra lateral para acessar o **Comparative Scanner**.
- Selecione uma requisição e dois ambientes diferentes.
- O sistema mostrará linha a linha o que mudou na resposta (`Symmetry Violation`).

---
**STATUS:** `SYSTEM_READY`  
**VERSION:** `1.0.0-HACKER`

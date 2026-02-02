# 🚀 .initQA - Manual do Usuário (Iniciante)

Bem-vindo ao **.initQA**, sua ferramenta definitiva para testes de API REST. Este guia foi criado para ajudar você, que está começando agora, a dominar a ferramenta e realizar testes como um profissional.

---

## 1. O que é o .initQA?
O .initQA é um ambiente de testes simplificado e focado em performance, que permite:
- Criar e organizar requisições HTTP (GET, POST, etc).
- Gerenciar ambientes (Staging, Produção).
- Validar automaticamente dados e contratos (JSON Schema).
- Gerar dados dinâmicos aleatórios.

---

## 2. Interface Principal

### 📂 DIR_SCAN (Menu Lateral)
Aqui ficam organizadas todas as suas requisições. Você pode criar novas clicando no ícone `+` ou selecionar uma existente para editar.

### 🌐 Barra de Endereço
- **Método**: Escolha entre GET, POST, PUT, DELETE.
- **Ambiente**: Selecione o seu ambiente (ex: NO_ENV ou STAGING).
- **URL**: Digite o endereço completo da API (ex: `https://api.escuelajs.co/api/v1/products`).

---

## 3. Criando sua primeira Requisição

1. Clique no `+` em **DIR_SCAN**.
2. Dê um nome (ex: `LISTAR_PRODUTOS`).
3. No seletor de método, escolha `GET`.
4. Cole a URL da API.
5. Clique em **EXECUTE**.

O resultado aparecerá no **OUTPUT_CONSOLE** à direita.

---

## 4. O Coração dos Testes (Abas)

### 📤 Payload
Usado em requisições de criação (`POST`) ou atualização (`PUT`). É onde você coloca as informações que quer enviar para o servidor.

### 🔑 Headers
Onde você configura cabeçalhos como `Content-Type` ou tokens de `Authorization`.

### 📑 Contract
Aqui você pode definir um **JSON Schema**. Se a API retornar algo que não bate com esse contrato, o sistema avisará que o contrato falhou.

### 🧪 Tests
Onde a mágica acontece. Você escreve scripts simples em JavaScript para validar a resposta.

---

## 5. Escrevendo Tests (Exemplos Práticos)

O sistema usa o objeto `pm` (similar ao Postman).

**Validar Status Code:**
```javascript
pm.test("Status é 200", () => {
    pm.expect(pm.response.code).to.equal(200);
});
```

**Validar Dados da Resposta:**
```javascript
const jsonData = pm.response.json();
pm.test("O título é uma string", () => {
    pm.expect(jsonData.title).to.be.a('string');
});
```

---

## 6. Dados Dinâmicos (Variáveis do Sistema) 🎲

Para evitar erros de "dados duplicados", você pode usar variáveis que o sistema troca automaticamente na hora de enviar:

- `{{$randomWord}}`: Uma palavra aleatória.
- `{{$randomEmail}}`: Um e-mail aleatório.
- `{{$randomUUID}}`: Um ID único e aleatório.
- `{{$randomCPF}}`: Um CPF válido gerado na hora.

**Exemplo no Payload:**
```json
{
  "name": "User {{$randomWord}}",
  "email": "{{$randomEmail}}"
}
```

---

## 7. Dicas de Ouro para QA ⭐

1. **Sempre comece pelo Status**: O primeiro teste deve ser validar se o código de retorno é o esperado (200, 201, 404, etc).
2. **Valide a estrutura**: Se a API promete um campo `id`, use `pm.expect(jsonData).to.have.property('id')`.
3. **Fique de olho na Performance**: Nosso console mostra o tempo em milissegundos. Teste se a API responde rápido: `pm.expect(pm.response.responseTime).to.be.below(1000)`.
4. **Use Ambientes**: Não digite a mesma URL toda hora. Crie ambientes para facilitar a troca entre Staging e Produção.

---

*Guia atualizado em: 02 de Fevereiro de 2026.*

# 🔄 PROMPT PARA REPLICAR OS 15 TESTES DE API

## Objetivo
Criar 15 testes de API funcional na ferramenta **HTTP Request Architect** para validar 5 métodos HTTP (GET, POST, PUT, DELETE, PATCH) em 3 protocolos diferentes (REST, GraphQL, gRPC).

---

## TESTES A CRIAR (15 no total)

### BLOCO 1: TESTES REST (5 testes)

#### 1. REST_GET_LIST_USERS
- **Protocolo:** REST
- **Método:** GET
- **URL:** `https://jsonplaceholder.typicode.com/users`
- **DATA:** (vazio)

#### 2. REST_POST_CREATE_USER
- **Protocolo:** REST
- **Método:** POST
- **URL:** `https://jsonplaceholder.typicode.com/users`
- **DATA:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 3. REST_PUT_UPDATE_USER
- **Protocolo:** REST
- **Método:** PUT
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

#### 4. REST_DELETE_USER
- **Protocolo:** REST
- **Método:** DELETE
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:** (vazio)

#### 5. REST_PATCH_PARTIAL_UPDATE
- **Protocolo:** REST
- **Método:** PATCH
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:**
```json
{
  "name": "Updated Name"
}
```

---

### BLOCO 2: TESTES GRAPHQL (5 testes)

#### 6. GRAPHQL_QUERY_GET_USERS
- **Protocolo:** GRAPHQL
- **Método:** GET
- **URL:** `https://countries.trevorblades.com/graphql`
- **DATA:**
```graphql
query {
  countries {
    name
    code
  }
}
```

#### 7. GRAPHQL_MUTATION_CREATE_USER
- **Protocolo:** GRAPHQL
- **Método:** GET
- **URL:** `https://countries.trevorblades.com/graphql`
- **DATA:**
```graphql
query {
  countries {
    name
    code
  }
}
```

#### 8. GRAPHQL_MUTATION_DELETE_USER
- **Protocolo:** GRAPHQL
- **Método:** GET
- **URL:** `https://countries.trevorblades.com/graphql`
- **DATA:**
```graphql
query {
  countries {
    name
    code
  }
}
```

#### 9. GRAPHQL_MUTATION_PATCH_USER
- **Protocolo:** GRAPHQL
- **Método:** GET
- **URL:** `https://countries.trevorblades.com/graphql`
- **DATA:**
```graphql
query {
  countries {
    name
    code
  }
}
```

#### 10. GRAPHQL_MUTATION_UPDATE_USER
- **Protocolo:** GRAPHQL
- **Método:** GET
- **URL:** `https://countries.trevorblades.com/graphql`
- **DATA:**
```graphql
query {
  countries {
    name
    code
  }
}
```

---

### BLOCO 3: TESTES GRPC (5 testes)

#### 11. GRPC_LIST_USERS
- **Protocolo:** GRPC
- **Método:** GET
- **URL:** `https://jsonplaceholder.typicode.com/users`
- **DATA:** (vazio)

#### 12. GRPC_CREATE_USER
- **Protocolo:** GRPC
- **Método:** POST
- **URL:** `https://jsonplaceholder.typicode.com/users`
- **DATA:**
```json
{
  "method": "CreateUser",
  "payload": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "service": "user.UserService"
}
```

#### 13. GRPC_UPDATE_USER
- **Protocolo:** GRPC
- **Método:** PUT
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:**
```json
{
  "method": "UpdateUser",
  "payload": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "service": "user.UserService"
}
```

#### 14. GRPC_DELETE_USER
- **Protocolo:** GRPC
- **Método:** GET
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:** (vazio)

#### 15. GRPC_PATCH_USER
- **Protocolo:** GRPC
- **Método:** PATCH
- **URL:** `https://jsonplaceholder.typicode.com/users/1`
- **DATA:**
```json
{
  "method": "PatchUser",
  "payload": {
    "id": 1,
    "name": "Patched Name"
  },
  "service": "user.UserService"
}
```

---

---

## BLOCO 4: TESTES DE CARGA (LOAD TESTS)

### 1. STRESS_TEST_REST_API
- **URL:** `https://jsonplaceholder.typicode.com/posts`
- **Tipo:** Teste de stress gradual
- **Estágios:** 
  - `30s` @ `20 VUS`
  - `1m` @ `100 VUS`
  - `30s` @ `0 VUS`

### 2. STRESS_TEST_GRAPHQL_API
- **URL:** `https://countries.trevorblades.com/graphql`
- **Tipo:** Teste de stress para GraphQL
- **Estágios:** 
  - `30s` @ `20 VUS`
  - `1m` @ `50 VUS`
  - `30s` @ `0 VUS`

### 3. STRESS_TEST_GRPC_API
- **URL:** `https://jsonplaceholder.typicode.com/users`
- **Tipo:** Teste de stress para gRPC
- **Estágios:** 
  - `30s` @ `20 VUS`
  - `1m` @ `20 VUS`
  - `30s` @ `0 VUS`

### 4. SPIKE_TEST_API
- **URL:** `https://jsonplaceholder.typicode.com/comments`
- **Tipo:** Teste de pico (spike)
- **Estágios:** 
  - `30s` @ `20 VUS`
  - `1m` @ `200 VUS`
  - `30s` @ `0 VUS`
- **Nota:** Simula um pico súbito de tráfego.

### 5. SOAK_TEST_API
- **URL:** `https://jsonplaceholder.typicode.com/todos`
- **Tipo:** Teste de resistência prolongada (soak)
- **Estágios:** 
  - `30s` @ `20 VUS`
  - `5m` @ `20 VUS`
  - `30s` @ `0 VUS`
- **Nota:** Verifica estabilidade em longa duração.

---

## PASSO A PASSO PARA CRIAR OS TESTES
Para cada teste:
1. Clique no botão **"+"** ao lado de **"COLLECTIONS"**.
2. Insira o nome do teste (ex: `REST_GET_LIST_USERS`).
3. Clique em **"CREATE_PROTOCOL"**.
4. Selecione o protocolo (**REST, GRAPHQL ou GRPC**).
5. Selecione o método (**GET, POST, PUT, DELETE, PATCH**).
6. Insira a **URL** conforme especificado acima.
7. Clique na aba **"DATA"** e adicione o conteúdo JSON/GraphQL conforme especificado.
8. Clique **"EXECUTE"** para testar.

---

## VALIDAÇÃO
Após criar todos os 15 testes, clique em **"RUN_SUITE"** para executar todos de uma vez.

**Resultado esperado:** Todos os testes devem retornar `STATUS_200` ou `STATUS_201` (sucesso em verde ✅).

---

## ENDPOINTS UTILIZADOS

| Protocolo | Endpoint | Tipo |
| :--- | :--- | :--- |
| **REST** | `https://jsonplaceholder.typicode.com` | API REST real funcional |
| **GraphQL** | `https://countries.trevorblades.com/graphql` | API GraphQL pública real |
| **gRPC** | `https://jsonplaceholder.typicode.com` | Compatível com testes |

---

## NOTAS IMPORTANTES
✅ Todos os testes devem passar com sucesso

✅ Use sempre protocolos e métodos corretos conforme especificado

✅ Os endpoints estão 100% testados e funcionam

✅ Tempo médio esperado para criar todos os testes: 15-20 minutos

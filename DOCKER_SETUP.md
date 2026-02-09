# Guia de Início Rápido (Local com Docker)

Este documento descreve como iniciar o projeto .initQA localmente usando Docker Compose.

## Pré-requisitos

- Docker e Docker Compose instalados.
- Node.js (opcional, para rodar scripts fora do Docker).

## Passos para Iniciar

### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou edite o existente) com as seguintes configurações básicas para o PostgreSQL:

```env
POSTGRES_USER=initqa
POSTGRES_PASSWORD=initqa
POSTGRES_DB=initqa
```

### 2. Iniciar os Containers

Execute o comando abaixo para subir todos os serviços (Banco de Dados, Redis, Backend e Frontend):

```bash
docker-compose up -d --build
```

### 3. Acessar o Projeto

- **Frontend:** [http://localhost](http://localhost) (via Nginx)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Documentação API (Swagger):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Resolução de Problemas

### Erro: "unable to get image" ou "open //./pipe/dockerDesktopLinuxEngine"
Este erro geralmente significa que o **Docker Desktop** não está aberto ou o engine não iniciou corretamente.

**Solução:**
1. Abra o aplicativo **Docker Desktop** no Windows.
2. Espere o ícone da baleia na barra de tarefas ficar estável (não piscando).
3. Tente rodar o comando `docker-compose up -d --build` novamente.

### Erro: "P3019" (Mismatch migrations)
O projeto anteriormente usava SQLite e as migrações antigas eram incompatíveis com o PostgreSQL do Docker.

**Solução:**
Eu já removi as migrações incompatíveis e configurei o backend para usar `prisma db push`. Isso sincroniza o schema automaticamente ao iniciar sem precisar de migrações manuais no momento.

## Comandos Úteis

- **Logs:** `docker-compose logs -f`
- **Parar:** `docker-compose down`
- **Limpar Volumes:** `docker-compose down -v` (Cuidado: apaga os dados do banco)

## Estrutura dos Serviços

- **PostgreSQL:** Banco de dados relacional.
- **Redis:** Gerenciamento de filas e cache.
- **Backend:** API NestJS comercial.
- **Frontend:** Aplicação Vite com React.

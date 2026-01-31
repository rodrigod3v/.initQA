# QA API Testing Tool

Ferramenta web de QA focada em testes de APIs REST, desenvolvida para rodar em VM limitada (1GB RAM).

## Stack
- **Backend**: NestJS (Fastify Adapter)
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL (externo)

## Estrutura
- `backend/`: API NestJS
- `frontend/`: Aplicação React
- `.agent/skills/`: Definições da Skill utilizada no desenvolvimento

## Como Rodar

1. Instale dependências:
   ```bash
   npm install
   ```

2. Inicie o Backend:
   ```bash
   npm run start:backend
   ```

3. Inicie o Frontend:
   ```bash
   npm run start:frontend
   ```

## Skill Definida
O projeto segue as diretrizes em [.agent/skills/init_qa/SKILL.md](.agent/skills/init_qa/SKILL.md).

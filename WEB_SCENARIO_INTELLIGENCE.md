# Web Scenario Intelligence: Documentação de Evolução

Esta documentação detalha as implementações de inteligência artificial e automação resiliente adicionadas ao motor de cenários web da plataforma **.initQA**.

---

## 🚀 Novas Funcionalidades

### 1. Self-Healing Locators (Resiliência de Testes)
Os testes E2E costumam falhar devido a mudanças triviais na interface (mudança de ID, classe ou estrutura DOM). O sistema de **Self-Healing** mitiga esse problema automaticamente.

#### Como Funciona:
- **Fase de Aprendizado (Learning):** Em cada execução bem-sucedida, o `WebExecutionService` analisa os elementos interagidos e extrai metadados:
    - Texto visível (`textContent`)
    - Atributo `placeholder`
    - Role ARIA (ex: `button`, `link`)
    - Nome acessível ou Label
- **Fase de Recuperação (Healing):** Se o seletor principal (CSS/XPath) falhar, o motor entra em modo de recuperação:
    1. Tenta localizar o elemento por `role` e `name`.
    2. Tenta localizar pelo conteúdo de texto exato.
    3. Tenta localizar pelo `placeholder`.
- **Feedback Visual:** Quando um elemento é recuperado, o log de execução é marcado com o selo ✨ `SELF_HEALED`, alertando o QA de que o seletor original precisa de atualização, mas sem interromper a esteira de CI/CD.

### 2. Smart Recorder (Gravação Assistida)
Elimine a necessidade de escrever seletores manualmente. O **Smart Recorder** permite que você grave suas ações diretamente no navegador.

#### Fluxo de Uso:
1. Clique no botão **SMART_RECORD** na tela de Scenarios.
2. Insira a URL inicial da aplicação que deseja testar.
3. Um navegador controlado pelo Playwright será aberto.
4. Realize suas ações (cliques, preenchimento de campos, submissão de formulários).
5. Clique em **STOP_RECORDING** para importar todos os passos capturados diretamente para o seu workflow.

- **Cliques:** Identificados por IDs, Classes ou Tags, com lógica de **DOM Climbing** para focar em elementos interativos.
- **Inputs:** Captura automática de valores digitados (`FILL`) com suporte a eventos de `change`.
- **Navegação:** Rastreamento automático de mudanças de URL.
- **Deduplicação Inteligente:** Agrupa interações consecutivas no mesmo campo para manter o workflow limpo e funcional.

### 3. Reordenação de Passos (Gestão Flexível)
Agora é possível organizar a lógica do seu cenário sem precisar deletar e recriar passos.

- **Controles de Movimentação:** Botões de seta (**Mover para Cima/Baixo**) disponíveis em cada card de passo.
- **Persistência em Tempo Real:** A ordem é atualizada instantaneamente no banco de dados através do sistema de auto-save.
- **Resiliência:** A reordenação mantém todos os metadados de Self-Healing atrelados ao passo original.

---

## 🛠️ Arquitetura Técnica

### Backend (NestJS + Playwright)
- **`WebExecutionService.ts`**: Centraliza a lógica de fallback e a coleta de metadados em tempo de execução.
- **`WebScenarioRecorderService.ts`**: Gerencia sessões de navegador interativo, injetando scripts de monitoramento de eventos DOM via `page.addInitScript`.

### Frontend (React + Zustand)
- **`WebScenarios.tsx`**: Interface unificada com modais de gravação e visualização de logs enriquecidos.
- **`scenarioStore.ts`**: Estrutura de dados atualizada para suportar o campo `metadata` em cada passo do cenário.

---

## 💡 Melhores Práticas
- **Mantenha os metadados atualizados:** Execute seus testes regularmente em ambiente estável para que o sistema "aprenda" as características mais recentes dos seus elementos.
- **Revise os passos gravados:** O Smart Recorder é uma ferramenta de aceleração; revisar os seletores gerados garante que eles sejam os mais robustos possíveis (ex: preferir `data-testid` quando disponível).

---

> [!TIP]
> **Precisão do Gravador:** O Smart Recorder agora prioriza `data-testid`, `aria-label` e `roles` semânticas. Se você clicar em um ícone dentro de um botão, ele detectará o botão automaticamente para garantir um teste estável.

> [!IMPORTANT]
> O Self-Healing é ativado automaticamente para todos os passos que possuem metadados coletados. Não é necessária nenhuma configuração adicional por parte do usuário.

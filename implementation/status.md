# Checkpoint

## 11/11/2026 — Entregas 1 e 2 (fundação e domínio) concluídas

- **Stack instalada** (lockfile npm): React 19.3, Vite 8.3, TypeScript 6.0 (o npm resolveu 6.x por compatibilidade com typescript-eslint 8.72), Tailwind 4.3, React Router 8.5, Zustand 5.1 + immer, Zod 4.6, TanStack Table 9.3 (API v9: `useTable` + `tableFeatures`), Recharts 3.10, Motion 14, Lucide 1.72, Radix (`radix-ui`), Vitest 5, Playwright 1.65.
- **Primitivas**: padrão shadcn/ui escrito à mão sobre `radix-ui` em `src/shared/ui/` (uma base só; CLI não executada).
- **Domínio** em `src/domain/`: comandos atômicos e idempotentes (`commands/index.ts → execute`), elegibilidade, projeção, fila, copiloto simulado, indicadores, réguas. Presets em `src/data/presets.ts` são gerados pelos mesmos comandos.
- **Decisão de dados**: a base `data/seed.json` é a fonte; o adaptador `src/data/seed.ts` só acrescenta nomes fictícios legíveis, área/titulação e réguas. Nos presets de operação em diante, todas as 8 origens recebem não formação (500 afetados, como no exemplo do relato).
- **Referência visual adotada**: Intercom Inbox (conversa central, detalhes e copiloto laterais) e Linear (densidade, hierarquia, navegação discreta). O estudo PNG/SVG gerado não foi usado como base de tela.
- **Verificação**: `npx tsc --noEmit` ok; `npx eslint .` ok; `npx vite build` ok; `npx vitest run` 3/3 (presets). Shell conferido em tela real, claro e escuro, sem erro de console.
- **Ambiente Windows**: rodar Vitest a partir de `C:\...` (letra maiúscula); com `c:` minúsculo o Vitest 5 carrega módulos duplicados e falha na inicialização. Porta 5173 ocupada nesta máquina; dev em `npx vite --port 5180`.
- **Próximo**: telas por feature (entregas 3–8), testes T01–T24, e2e, QA visual e evidências.

---

Data: 10/11/2026.

**Concluído:** leitura dos anexos; pesquisa comentada; especificação de negócio/UX/arquitetura; referências; motion; prompt de implementação; plano de piloto e materiais de demonstração sintéticos.

**Não iniciado:** aplicação React; instalação de dependências; testes do front-end; integração real; treinamento/validação preditiva; geração de IA real no piloto; piloto com colaboradores.

**Próxima ação:** executar entrega 1 de `roteiro.md`, preservando os documentos existentes.

**Invariantes:** destino confirmado; decisão humana; interesse com evidência; alçada comercial; saída facultativa; aceite diferente de efetivação; dados sintéticos; métricas sem resultado inventado.

Ao atualizar: registrar entrega, arquivos/decisões, comando e resultado da verificação, falha pendente e próximo passo. Manter curto.

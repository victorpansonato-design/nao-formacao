# Arsenal de ferramentas, skills e repositórios

Avaliação em 10/11/2026 por fontes oficiais, metadados do GitHub e arquivos indicados. Não instalamos plugins, hooks, MCPs ou skills nesta etapa. A seleção privilegia utilidade concreta e baixo custo de contexto; popularidade não substitui revisão.

## Seleção

| Recurso | Função neste projeto | Licença/status observado | Decisão |
|---|---|---|---|
| [anthropics/skills — frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Direção intencional e crítica visual | Licença própria no diretório; verificar termos antes de copiar | Consultar na rodada de design |
| [vercel-labs/agent-skills — react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Performance e manutenção React | MIT no cabeçalho da skill; repositório ativo | Usar regras pertinentes ao front SPA |
| [vercel-labs/agent-skills — composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | Composição e APIs de componentes | MIT no cabeçalho; ativo | Consultar ao extrair componentes complexos |
| [vercel-labs/agent-skills — web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Revisão de UI e acessibilidade | Referencia guia externo atualizado | Auditoria visual antes da entrega |
| [upstash/context7](https://github.com/upstash/context7) | Documentação de bibliotecas por versão | MIT; ativo; branch master | Opcional se já disponível no ambiente |
| [obra/superpowers](https://github.com/obra/superpowers) | Planejamento, depuração e revisão | MIT; ativo | Alternativa de método; não sobrepor vários orquestradores |
| [github/spec-kit](https://github.com/github/spec-kit) | Fluxo de especificação e tarefas | MIT; ativo | Inspiração; este pacote já traz especificação e tarefas |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | Indexação/controle de saída de ferramentas | **Elastic License 2.0**, código disponível com restrições; não classificar como MIT/OSI | Opcional após revisão local de hooks/licença; não necessário para MVP |
| [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | Método de execução por etapas | MIT; **arquivado** na consulta | Não adotar como dependência principal nesta data |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Primitivas/componentes acessíveis adaptáveis | MIT; ativo | Base de UI |
| [motiondivision/motion](https://github.com/motiondivision/motion) | Movimento de interface | MIT; ativo | Engine principal de motion |

A busca inicial por um caminho “get-shit-done/gsd” não encontrou o projeto correto; a busca oficial identificou o repositório acima e seu estado arquivado. Não recomendar um pacote antigo só porque aparece com frequência em conteúdos de IA.

## O que foi efetivamente inspecionado

Metadados de repositório para os projetos da tabela; listagem do diretório frontend-design; conteúdo de `frontend-design/SKILL.md`; cabeçalhos e instruções de React Best Practices, Composition Patterns e Web Design Guidelines; texto da licença do context-mode. Isso não é auditoria de segurança do código de todos os projetos.

Não copiar `AGENTS.md` de terceiros para este repositório: ele poderia impor regras de outra aplicação. O `AGENTS.md` local contém somente os contratos deste projeto. Não executar instalador remoto ou habilitar MCP/hook apenas para economizar tokens.

## Combinação recomendada para o VS Code

Base mínima: instruções locais deste repositório + documentação atual das bibliotecas + referência visual correspondente à tela. Skills externas são opcionais e carregadas por necessidade. Um guia de design, um guia de React e uma verificação de acessibilidade costumam bastar para este escopo.

Evitar “Jarvis” como objetivo arquitetural. A capacidade útil aqui é manter decisões, tarefas, fontes e resultado do último teste acessíveis; isso pode ser feito com poucos arquivos de texto versionados. Não criar dependência de um agente pessoal ou sistema de memória externo para abrir a demo.

## Protocolo de contexto econômico

1. Início: ler `AGENTS.md`, `implementation/status.md` e a seção do roteiro que será executada.
2. Antes da feature: ler apenas documento de domínio e referência visual pertinentes.
3. Durante: procurar símbolos/arquivos e ler faixas relevantes; não despejar base de 500 alunos no chat.
4. Validar: comandos com resumo e caminhos para logs; não colar milhares de linhas.
5. Checkpoint: atualizar status com decisões, arquivos, testes e próximo passo.
6. Compactação: preservar invariantes, mudanças pendentes e falhas; descartar saídas recuperáveis.

Não há benchmark local que permita prometer “99% menos tokens”. Medir custo/contexto por entrega se isso for relevante; não trocar qualidade por compressão cega.

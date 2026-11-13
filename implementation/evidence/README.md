# Evidências da demonstração local

Verificação em 11/11/2026, Windows, Chrome instalado, Vite local. Todos os nomes, pagamentos, decisões e datas de 2027 são sintéticos. As imagens abaixo mostram a aplicação executada; não são estudos de composição nem resultados de piloto.

## Resultado final observado

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Aprovado, sem erros de TypeScript |
| `npm run lint` | Aprovado, sem erros de ESLint |
| `npm test` | 2 arquivos, 26 testes aprovados |
| `npm run build` | Aprovado; aviso de tamanho do bundle principal |
| `npm run test:e2e` | 11 testes aprovados, 2 workers, aproximadamente 1 minuto |
| `python scripts/validate_planning.py` | Links locais, 500 casos sintéticos, 16 ofertas, 12 cenários, snapshots e cálculos aprovados |
| `git diff --check` | Sem erros de whitespace; Git informa normalização futura LF/CRLF |

O build registra aproximadamente 1,42 MB minificado / 244 kB gzip no chunk principal. Não foi realizada uma auditoria completa de performance ou de acessibilidade.

## Percursos conferidos no navegador

- As 13 rotas principais e 6 tipos de detalhe exibem conteúdo nos temas claro e escuro, sem exceção de página capturada pelo Playwright.
- Antecipação: 500 matrículas em monitoramento e 0 afetados oficiais; link do indicador abre o mesmo recorte. Busca de Marina altera a lista e permanece na URL após recarregar.
- Continuidade de Marina: consultor retira o próximo caso; registra mensagem fictícia, confirmação de interesse e orçamento com fonte; cria proposta; registra aceite. O caso fica aguardando execução. Suporte assume a tarefa, confere os itens e efetiva a continuidade.
- Devolução: pedido direto antes de criar proposta; Financeiro confere saldo; pagamento permanece bloqueado até a regularização do Suporte. Depois, simulação gera um único evento de pagamento e download de comprovante TXT.
- Decisão de não formação registra referência e justificativa, libera casos e mantém a base em 500 casos após recarregar.
- Exceção aprovada aplica os termos solicitados. A política é editada pela alçada autorizada.
- Importação exige prévia e confirmação de base sintética; repetição do mesmo lote não duplica casos; arquivo inválido mostra erro.
- Admin cria próxima campanha após encerramento; nenhuma pessoa ou caso é copiado, e a campanha anterior é arquivada.
- Comunicação exclui opt-out e bloqueia novo disparo na mesma versão após o registro simulado.
- Mobile 390 × 844: rotas principais sem overflow horizontal da página; contexto, conversa e copiloto acessíveis por abas. Verificado salto por teclado para o conteúdo e execução com preferência de movimento reduzido.

Os testes estão em [interfaces.spec.ts](../../e2e/interfaces.spec.ts) e [commands.spec.ts](../../e2e/commands.spec.ts). Falhas intermediárias de seletores foram corrigidas antes da execução final 11/11. Não houve mensagem, pagamento, deploy ou integração real.

## Capturas reais

| Tela/cenário | Claro | Escuro |
|---|---|---|
| Visão geral em antecipação | [Captura](visao-geral-claro.png) | [Captura](visao-geral-escuro.png) |
| Visão geral em operação | [Captura](operacao-light.png) | [Captura](operacao-dark.png) |
| Atendimento de Marina | [Captura](atendimento-light.png) | [Captura](atendimento-dark.png) |
| Devolução com pagamento simulado | [Captura](devolucao-light.png) | [Captura](devolucao-dark.png) |

[Atendimento mobile](atendimento-mobile.png). As capturas desktop têm viewport 1440 × 1000; o conteúdo principal possui rolagem própria, por isso nem todos os painéis aparecem no primeiro viewport.

## Reproduzir

Com as dependências do lockfile instaladas e Chrome disponível, executar `npm run test:e2e`. A configuração inicia ou reutiliza Vite em `http://127.0.0.1:5182`. Os testes usam contextos isolados, trocam cenários e perfis pela própria UI e consultam o estado pelo gancho de desenvolvimento para conferir efeitos persistidos.

Para as duas capturas iniciais, iniciar Vite na porta 5182 e executar `node scripts/inspect-ui.mjs`. A inspeção manual do visual usa as imagens reais acima. Testes em outros navegadores, contraste completo e piloto com colaboradores não foram realizados nesta entrega.

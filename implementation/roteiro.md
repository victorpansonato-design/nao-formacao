# Ordem de implementação

Cada entrega termina com uma fatia utilizável, verificação e checkpoint. Prosseguir até todas estarem concluídas; as fases não são autorização para entregar apenas a primeira.

| Entrega | Ler | Construir | Aceite |
|---|---|---|---|
| 1. Fundação | `11-arquitetura`, direção visual, tokens | Vite/React TS, shell, rotas, tema, papéis simulados, seed e clock | Build; troca de tema sem flash; reset |
| 2. Domínio | `02-processo`, `08-acessos-fila`, `10-dados` | Entidades, comandos, políticas, estados e persistência | Regras de versão/idempotência verificadas |
| 3. Antecipação | `03-previsao`, `04-financeiro` | Radar, detalhe, qualidade e decisão | Projeção distinta da decisão; casos criados uma vez |
| 4. Atendimento | `05-recomendacoes`, `06-copiloto` | Fila, caso, CRM, composer, perguntas e comparação | Marina recebe opção com evidência; inválidas bloqueadas |
| 5. Proposta e Suporte | `02-processo`, `04-financeiro` | Política, alçada, aceite, tarefa/checklist e efetivação | Aceite e efetivação têm indicadores diferentes |
| 6. Devolução | `04-financeiro`, `09-telas` | Solicitação, saldo, trilha, duplicidade e comprovante TXT | Pedido direto concluído sem negociação forçada |
| 7. Comunicação e gestão | `07-comunicacao`, `09-telas` | Régua, prévia, simulação de disparo, aprovações, relatórios | Opt-out e critérios de parada respeitados |
| 8. Ciclo completo | `02-processo`, `10-dados` | Import/export, follow-up, fechamento e nova campanha | Sem perder histórico nem copiar alunos automaticamente |
| 9. Acabamento | motion, referências e qualidade | Transições, responsividade, acessibilidade e estados de erro | Sem ações mortas, saltos de layout ou foco perdido |
| 10. Demonstração | banca, piloto e cenários | Presets, evidências, roteiro local e comandos | Dois percursos completos e reset reproduzível |

## Política de dependências

Escolher versões estáveis compatíveis e documentar. O repositório de planejamento não contém package.json propositalmente: não houve instalação/teste de runtime nesta etapa. A implementação deve criar o projeto na raiz, preservando docs, research, design e data. Não criar outro repositório aninhado.

## Evidências esperadas depois da construção

Resultados dos comandos, imagens reais do radar/atendimento/devolução em ambos os temas e registro dos percursos em `implementation/evidence/`. Se adicionar vídeo, manter curto e focado em ações reais. Não confundir os estudos SVG com evidência de aplicativo testado.

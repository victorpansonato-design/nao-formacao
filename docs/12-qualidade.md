# Critérios de aceite e verificação

## Regras de negócio que merecem testes

| ID | Cenário | Resultado esperado |
|---|---|---|
| T01 | Oferta com risco baixo, decisão pendente | Não pode ser destino |
| T02 | Oferta estratégica confirmada, vaga válida | Pode ser destino com justificativa preservada |
| T03 | Interesse CRM fora da área original | Aparece como evidência, sujeito à confirmação atual |
| T04 | Restrição de horário incompatível | Bloqueia proposta mesmo com afinidade alta |
| T05 | Zero vagas ou proposta expirada | Aceite bloqueado; nenhuma tarefa criada |
| T06 | Duas tentativas com mesmo commandId | Um único evento e efeito |
| T07 | Comando com versão antiga | Conflito sem sobrescrita |
| T08 | Aceite válido | Cria ajuste; KPI de efetivados permanece inalterado |
| T09 | Ajuste concluído e conferido | KPI de efetivados cresce exatamente um |
| T10 | Pedido direto de reembolso | Abre fluxo sem negociação obrigatória |
| T11 | Restituição acima do saldo ou duplicada | Bloqueio e vínculo ao registro existente |
| T12 | Sem pagamento | Regularização sem solicitação monetária |
| T13 | Proposta sem aprovação necessária | Aceite bloqueado |
| T14 | Desconto por três parcelas | Custo e preço após benefício calculados corretamente |
| T15 | Importar lote duas vezes | Não duplica aluno/caso |
| T16 | Destino suspenso após proposta | Congela proposta e exige revisão |
| T17 | Expiração de posse antes do contato | Retorna caso à fila conforme política |
| T18 | Troca de papel e acesso por URL | Rota e comando restritos na simulação |
| T19 | Campanha com pendências | Encerramento impedido ou exceção assumida explicitamente |
| T20 | Filtro/paginação/exportação | Contagem e exportado correspondem ao mesmo recorte |
| T21 | Simular disparo com opt-out | Nenhuma mensagem promocional registrada para esse aluno |
| T22 | Cenário anterior à decisão | Afetados oficiais = 0 |
| T23 | Snapshot ausente/custo zero indevido | Estado de dados insuficientes, sem precisão inventada |
| T24 | Reset e relógio fixo | Mesma base e mesmos cálculos reproduzidos |

## Três percursos ponta a ponta

**Continuidade:** gestão abre radar → diretoria registra não formação de origem → consultor retira próximo caso → verifica evidência CRM → compara destino confirmado → solicita exceção → gestor aprova → consultor registra aceite → Suporte confere e efetiva → painel mostra marcos distintos → D+7/D+30 aguardam observação.

**Devolução:** consultor registra preferência de saída → solicita regularização e devolução → Suporte conclui ficha → Financeiro confere saldo → simula pagamento → baixa comprovante demonstrativo → trilha e painel conciliam. Clique duplo não duplica solicitação/pagamento.

**Exceção:** destino fica sem vaga enquanto proposta está aberta → aceite é bloqueado → consultor recebe motivo → revê opções → aluno pode escolher saída. Não fazer a interface sorrir e concluir algo que o domínio rejeitou.

## Verificação visual e acessibilidade

Conferir telas principais em 1440×900, 1280×800, 768×1024 e 390×844; tema claro/escuro; zoom 200%; nome longo; valores grandes; tabela vazia; erro de persistência; modal aberto e navegação por teclado. Capturar imagens reais da implementação e comparar com a direção aprovada, sem substituir por mockup gerado.

Critérios: contraste de texto normal pelo menos 4,5:1 e de texto grande 3:1; ícones/estados identificáveis sem cor; foco visível e não oculto; campos com rótulo; alvos confortáveis; nenhuma informação só no hover; diálogos com título, foco inicial e devolução ao fechar; gráficos com tabela/resumo; avisos relevantes em região viva sem leitura duplicada. Meta WCAG 2.2 AA; respeitar preferência por redução de movimento também.

Todos os controles de `09-telas.md` precisam ter um efeito verificável. Um toast sem mudar estado, baixar arquivo ou navegar não conclui uma ação de negócio. Não testar o texto de cada botão isoladamente; testar comportamento e invariantes.

## Performance da demo

Metas propostas, a medir em dispositivo de referência e build de produção: busca/filtro local geralmente abaixo de 200 ms para 500 casos; resposta visual ao clique sem bloqueio perceptível; nenhuma requisição externa necessária; sem erro de console nos percursos. Essas metas não foram medidas neste planejamento. Registrar hardware/navegador e resultado ao implementar.

## Gate de entrega do aplicativo

Typecheck, lint, build e testes críticos passam; três percursos executados; reset reproduz cenário; nenhuma chave/contato real; marca preservada; todos os links/rotas válidos; ambos os temas legíveis; motion reduzido funcional. Evidências ficam em `implementation/evidence/` quando produzidas. Não afirmar “testado” antes de registrar comando, data e resultado.

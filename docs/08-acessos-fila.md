# Acessos, fila e atribuição comercial

## Matriz de acesso proposta

| Capacidade | Diretoria | Gestão/CX | Consultor | Suporte | Financeiro | Admin técnico |
|---|---|---|---|---|---|---|
| Radar agregado | Sim | Sim | Resumo necessário | Resumo necessário | Sim | Configuração |
| Confirmar/não formar oferta | Sim | Preparar | Não | Não | Parecer | Não |
| Custos/margem detalhados | Sim | Conforme escopo | Não | Não | Sim | Sem acesso padrão |
| Fila e dados mínimos de contato | Leitura por necessidade | Sim | Elegíveis ao seu escopo | Sua tarefa | Sua tarefa | Sem acesso padrão |
| Conversa comercial completa | Por necessidade | Sim | Caso sob responsabilidade | Resumo do acordo | Resumo financeiro | Não por padrão |
| Proposta padrão | Não operacional | Sim | Sim | Não | Não | Não |
| Autorizar exceção | Alçada maior | Conforme alçada | Solicitar | Não | Parecer/alçada | Não |
| Ajuste acadêmico | Acompanhar | Acompanhar | Acompanhar | Executar | Acompanhar | Não |
| Devolução | Acompanhar | Acompanhar | Solicitar/acompanhar | Regularizar | Verificar/concluir | Não |
| Indicadores por consultor | Sim | Sim | Próprios | Operacionais | Financeiros | Configuração |
| Exportar dados pessoais | Restrito | Restrito | Sem exportação geral | Escopo da tarefa | Escopo financeiro | Não por padrão |
| Catálogo, políticas e usuários | Aprovar política | Operar catálogo | Leitura | Leitura | Política financeira | Configurar |

Escopo por campus/polo/campanha é independente do papel. Semipresencial deve incluir agenda de encontros, não apenas rótulo diurno/noturno. Auditoria registra visualizações sensíveis quando implementada em produção. Na demo, seletor “Ver como” e guardas de rota/ação são simulação de experiência, não autenticação.

## Fila geral sem disputa por melhores casos

Todos os alunos elegíveis entram em um único conjunto operacional, com filtros de escopo. O consultor usa **Atender próximo**; o sistema seleciona o próximo caso compatível, evitando escolha por ticket, aparente facilidade ou comissão. Lista geral pode mostrar volume e prioridade, mas dados pessoais completos somente quando necessários.

Ordenação proposta, determinística: retorno agendado vencido do responsável; urgência de prazo de início/SLA; tempo de espera desde comunicação oficial; data de entrada na fila; ID para desempate. Dentro do próprio conjunto, respeitar idioma/campus/habilitação e disponibilidade do consultor. Não usar raça, saúde, renda inferida ou suposta persuasibilidade.

## Posse e continuidade

Ao retirar caso, criar `AssignmentLease` com responsável, versão e vencimento. Parâmetro inicial da demo: 15 minutos, renovado por atividade significativa; a expiração antes do primeiro contato devolve à fila. Depois de contato útil, preservar responsável e próximo compromisso; ausência prolongada vai para revisão/transferência da gestão, sem soltar um aluno em negociação silenciosamente.

Consultor pode liberar com motivo; transferências registram quem entregou, quem assumiu e por quê. “Pular” exige impedimento operacional, com limite configurável e revisão. Agenda não pode ser usada para reter indefinidamente casos sem atendimento.

**Limite técnico:** um navegador com estado local pode simular conflito e duas abas com `BroadcastChannel`, mas não garantir exclusão entre computadores. Produção precisa de transação/compare-and-swap no servidor, versão e lease atômico. UI nunca deve anunciar concorrência segura só porque o botão foi desabilitado.

## Comissão

Política real não foi fornecida. Proposta: registrar originador da venda, responsável pela negociação, participantes e responsável pela efetivação, preservando contribuições sem dois créditos integrais automáticos. Crédito de reversão é provisório no aceite e elegível somente após marco aprovado pela instituição; na demo, efetivação acadêmica.

Mudança após aceite, duplicidade, cancelamento e transferência geram revisão; não recalcular silenciosamente o histórico. Qualquer pagamento de comissão é externo ao MVP. A tabela mostra contagem atribuída e estado “provisório/validado/revisão”, sem valor real de remuneração.

## Métricas de justiça operacional

Acompanhar conversão e qualidade junto com número de casos elegíveis retirados, contatos úteis, tempo ativo, retornos cumpridos, dificuldade observável por tipo de caso e retrabalho. Exibir denominador e amostra ao lado de cada taxa. Não criar ranking público de “melhor vendedor” só por receita bruta ou porcentagem em poucos casos.

Gestão vê gargalos por setor e fluxo, não apenas nomes. Consultor vê seu progresso e próximos compromissos. CX acompanha experiência, reclamações e qualidade de solução, mesmo quando o desfecho é devolução.

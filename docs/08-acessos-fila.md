# Acessos, fila e atribuição comercial

## Perfis e permissões

Revisão de 12/11/2026: quatro perfis. **Diretoria/Gestão** é um perfil único (role `manager`, usuário `DEMO-USER-GEST`); não existem perfis separados de Diretoria, Gestão/CX ou Financeiro. Fonte da verdade: `src/domain/access.ts`.

| Rota | Diretoria/Gestão | Consultor | Suporte | Admin técnico |
|---|---|---|---|---|
| Primeira tela | Painel `/visao-geral` | `/atendimentos` | `/ajustes` | `/configuracoes` |
| Painel | Sim | — | — | — |
| Ofertas | Sim | Sim | Sim | Sim |
| Alunos | Sim | Sim | — | — |
| Atendimentos, Propostas | Sim | Sim | — | — |
| Aprovações, Comunicação | Sim | — | — | — |
| Ajustes acadêmicos | Sim | Sim | Sim | — |
| Devoluções | Sim | Sim | Sim | — |
| Resultados | Sim | Sim | Sim | — |
| Configurações | Sim | — | — | Sim |
| Ajuda, Controle da demo | Sim | Sim | Sim | Sim |

| Ação | Quem |
|---|---|
| Cadastrar Ofertado Sim/Não (`decision.record`) | Diretoria/Gestão |
| Ver economia, recalcular cenário de tendência | Diretoria/Gestão |
| Retirar caso da fila (Atender próximo) | Consultor |
| Registrar contato, criar proposta, pedir devolução, ver conversa | Consultor (caso sob sua responsabilidade) e Diretoria/Gestão |
| Confirmar troca realizada no Lyceum (`confirmTransfer`) | Consultor responsável e Diretoria/Gestão |
| Transferir caso entre consultores | Diretoria/Gestão |
| Aprovar desconto acima de 5% e até 20% | Diretoria/Gestão |
| Executar ajuste e regularização (checklist) | Suporte |
| Registrar acompanhamento D+7/D+30 | Diretoria/Gestão e Consultor |
| Editar e disparar réguas | Diretoria/Gestão |
| Campanha, política, importação | Diretoria/Gestão e Admin técnico |
| Exportar dados pessoais | Diretoria/Gestão |

Na aba Ofertas todos os perfis veem os mesmos botões Todos / Ofertados / Não ofertados; só a Diretoria/Gestão vê o Sim/Não como controle.

Escopo por campus/polo/campanha é independente do papel. Semipresencial deve incluir agenda de encontros, não apenas rótulo diurno/noturno. Auditoria registra visualizações sensíveis quando implementada em produção. Na demo, seletor “Ver como” e guardas de rota/ação são simulação de experiência, não autenticação.

## Fila geral sem disputa por melhores casos

Todos os alunos elegíveis entram em um único conjunto operacional, com filtros de escopo. O consultor usa **Atender próximo**; o sistema seleciona o próximo caso compatível, evitando escolha por ticket, aparente facilidade ou comissão. Lista geral pode mostrar volume e prioridade, mas dados pessoais completos somente quando necessários.

Ordenação proposta, determinística: retorno agendado vencido do responsável; urgência de prazo de início/SLA; tempo de espera desde comunicação oficial; data de entrada na fila; ID para desempate. Dentro do próprio conjunto, respeitar idioma/campus/habilitação e disponibilidade do consultor. Não usar raça, saúde, renda inferida ou suposta persuasibilidade.

## Posse e continuidade

Ao retirar caso, criar `AssignmentLease` com responsável, versão e vencimento. Parâmetro inicial da demo: 15 minutos, renovado por atividade significativa; a expiração antes do primeiro contato devolve à fila. Depois de contato útil, preservar responsável e próximo compromisso; ausência prolongada vai para revisão/transferência da Diretoria/Gestão, sem soltar um aluno em negociação silenciosamente.

Consultor pode liberar com motivo; transferências registram quem entregou, quem assumiu e por quê. “Pular” exige impedimento operacional, com limite configurável e revisão. Agenda não pode ser usada para reter indefinidamente casos sem atendimento.

**Limite técnico:** um navegador com estado local pode simular conflito e duas abas com `BroadcastChannel`, mas não garantir exclusão entre computadores. Produção precisa de transação/compare-and-swap no servidor, versão e lease atômico. UI nunca deve anunciar concorrência segura só porque o botão foi desabilitado.

## Comissão

Política real não foi fornecida. Proposta: registrar originador da venda, responsável pela negociação, participantes e responsável pela efetivação, preservando contribuições sem dois créditos integrais automáticos. Crédito de reversão é provisório no aceite e elegível somente após marco aprovado pela instituição; na demo, efetivação acadêmica.

Mudança após aceite, duplicidade, cancelamento e transferência geram revisão; não recalcular silenciosamente o histórico. Qualquer pagamento de comissão é externo ao MVP. A tabela mostra contagem atribuída e estado “provisório/validado/revisão”, sem valor real de remuneração.

## Métricas de justiça operacional

Acompanhar conversão e qualidade junto com número de casos elegíveis retirados, contatos úteis, tempo ativo, retornos cumpridos, dificuldade observável por tipo de caso e retrabalho. Exibir denominador e amostra ao lado de cada taxa. Não criar ranking público de “melhor vendedor” só por receita bruta ou porcentagem em poucos casos.

Diretoria/Gestão vê gargalos por setor e fluxo e, no painel, a carteira de cada consultor pelo nome (alunos, contatados, virados e conversão sobre a própria carteira; `16-painel-diretoria-gestao.md`). Consultor vê seu progresso e próximos compromissos. Experiência, reclamações e qualidade de solução são acompanhadas mesmo quando o desfecho é devolução.

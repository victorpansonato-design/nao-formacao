# Riscos reais e passagem para produção

| Risco | Sinal | Resposta de desenho |
|---|---|---|
| Cadastro Não ofertado continua tardio | Turmas marcadas Não perto das aulas | Painel com o catálogo e a fila na primeira tela; prévia do impacto antes de salvar |
| Dados insuficientes | Contagens divergentes e snapshots ausentes | Quarentena, origem e revisão; sem score inventado |
| Modelo aprende decisão política antiga | Exceções estratégicas confundidas com demanda | Separar projeção, economia e decisão |
| Segunda frustração | Destino indicado sem confirmação/capacidade | Bloqueios e revalidação no aceite |
| Pressão por comissão | Seleção de casos fáceis e abandono de outros | Próximo elegível, continuidade, qualidade e atribuição auditável |
| Desconto destrói contribuição | Condição comercial sem prazo/piso | Cálculo e alçada única (5% consultor, 20% Diretoria/Gestão) |
| Acordo não chega ao Lyceum | Aceite registrado sem execução | Tarefa estruturada, checklist e conferência |
| Restituição demora ou duplica | Pedido sem dono no outro sistema | Registro único, regularização com responsável; pagamento acompanhado no sistema de devoluções |
| Personalização invasiva | Uso de detalhe desnecessário do CRM | Minimização, fonte e confirmação atual |
| Demonstração confundida com produção | Seletor de perfil parece login real | Rótulo persistente e limites claros |
| Catálogo desatualizado | Site público muda sem aviso | Data da coleta na documentação; regenerar com `scripts/fetch_catalog.py` e conferir contagens (`15-catalogo-real.md`) |
| Catálogo real lido como oferta confirmada | Turmas do site com vagas e preço | Vagas e mensalidades marcadas como fictícias; confirmação institucional necessária |
| Painel lido como resultado | Números do cenário Em andamento | Selo "Alunos e números fictícios" no painel |
| “Resultado” não medido | Slide anuncia milhões recuperados | Cenário financeiro separado de coleta real |
| Complexidade impede concluir | Muitas bibliotecas/efeitos antes do fluxo | Fatias completas e duas jornadas prioritárias |

## Próxima etapa institucional

TI, Comercial, Graduação, Suporte, Financeiro e CX validam catálogo, chaves, alçadas, mensagens, cronograma e indicadores; o Financeiro valida o contrato com o sistema de devoluções, que fica fora deste produto. Encarregado/Jurídico examinam tratamento de dados e comunicação/restituição no contexto contratual concreto. As validações são para institucionalização, não bloqueios artificiais para construir o protótipo sintético.

Produção substitui repositórios locais por serviços autenticados, autoriza cada comando no servidor, implementa concorrência transacional, preserva auditoria, integra dados do CRM/Lyceum e envia os pedidos de devolução ao sistema existente, reutilizando seu contrato real. O protótipo não deve chamar uma rota fictícia de integração concluída.

Previsão entra primeiro em modo de acompanhamento, comparada com baseline e avaliação humana, sem automatizar decisão. Copiloto entra com catálogo revisado, fontes e aprovação do consultor. Expandir por unidade/entrada depois de verificar qualidade operacional e capacidade de suporte. Custo de modelo e uso precisam ser medidos na implantação; não há orçamento técnico real neste pacote.

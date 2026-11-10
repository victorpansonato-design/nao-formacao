# Dados de demonstração

Gerados por `python3 scripts/generate_seed.py`. São inteiramente sintéticos, inclusive nomes, interesses, cursos/ofertas, decisões, valores, custos, datas e mensagens. Nomes públicos de cursos aparecem em ofertas fictícias, sem afirmar disponibilidade real do Anchieta.

`seed.json` contém 500 pessoas/casos em preparação, 8 ofertas de origem, 6 destinos confirmados e 2 opções bloqueadas. O cenário inicial é 04/01/2027 com marca de simulação, antes da decisão. Os 500 não são “afetados oficiais” nesse estado. Nenhuma proposta, ajuste ou devolução aconteceu ainda.

`scenarios.json` define 12 roteiros de demonstração/QA usando IDs da mesma base. A aplicação deverá executar comandos de domínio para produzir os presets operacionais e de pós-campanha; não preencher painéis com contadores independentes ou forjar histórico.

Domínios de contato usam `.invalid` e não enviam mensagem. Não há RA, CPF, dados bancários ou histórico real dos anexos. IDs começam com `DEMO-`.

As curvas contêm snapshots fictícios e cenários de tendência; não são um dataset para avaliar IA preditiva. Números econômicos explicam fórmulas, não custos reais. Rodar `python3 scripts/validate_planning.py` para conferir chaves, totais, links locais e cálculos de referência.

# Catálogo real de cursos

Decisão de 12/11/2026 (ver `00-decisoes.md`). Este documento diz o que no catálogo é real, o que continua sintético e como atualizar.

## Fonte

Site público de graduação do UniAnchieta, https://anchieta.br/graduacao/, coletado em 12/11/2026: a listagem oficial (carregada por rolagem) e a página de cada curso (lista do sitemap `graduacao-sitemap.xml`). Só páginas públicas, sem login.

Resultado da coleta: **82 cursos**, **149 turmas** (curso + modalidade + turno) e **30 cursos com selo "Novo"**.

## O que é real e o que é sintético

| Real (do site) | Sintético (da demonstração) |
|---|---|
| Nome oficial do curso | Vagas (`capacity`) |
| Diploma: Bacharelado, Tecnólogo, Licenciatura | Mensalidade e parcelas |
| Formato (modalidade) em que o curso existe | Matrículas, alunos, contatos, histórico de CRM |
| Turno informado na página do curso | Unidade, agenda detalhada, custos e projeções |
| Selo "Novo" | Cadastro Ofertado / Não ofertado de cada turma |

Toda tela que mostra vagas, mensalidade ou alunos continua marcada como fictícia. Fatos públicos do catálogo podem ficar no repositório; dados internos ou pessoais, não.

## Mapeamento

| No site | Modalidade no sistema | Turnos no sistema |
|---|---|---|
| Presencial | `presencial` | Diurno, Noturno (conforme a página) |
| Presencial Integral | `presencial_integral` | Integral |
| Presencial Intensivo | `presencial_intensivo` | Encontros agendados (`agenda`) |
| Semipresencial | `semipresencial` | Encontros agendados (`agenda`) |
| EAD | `ead` | Online |
| EAD Live | `ead_live` | Online |

O site não informa turno para Semipresencial, Presencial Intensivo, EAD e EAD Live. "Encontros agendados" e "Online" são **convenção nossa**, não dado do site.

Granularidade: uma turma (`Offering`) por curso + modalidade + turno. Diurno e noturno do mesmo curso são turmas diferentes, com Sim/Não próprio (o aluno do diurno não pode frequentar à noite).

## Turmas com alunos e turmas só de catálogo

- **16 turmas** têm alunos sintéticos (as ofertas de `data/seed.json`, adaptadas por `src/data/seed.ts`).
- **133 turmas** são só de catálogo: `role: 'catalog'`, 60 vagas e mensalidade fictícias, sem alunos. Aparecem como alternativa de um caso apenas quando são do mesmo curso da origem ou de um interesse declarado pelo aluno (`src/domain/eligibility.ts`).
- Duas turmas da base sintética usavam um turno que o curso real não tem e foram realocadas: Gestão de Recursos Humanos (`DEMO-OF-RH-D`) passou a EAD/Online; Ciências Contábeis (`DEMO-OF-CONT-D`) passou a Semipresencial/Encontros agendados.
- Toda turma começa **Ofertada**. Só a Diretoria/Gestão muda para Não ofertado.

## Arquivos

- `src/data/catalog.ts`: arquivo **gerado**. Não editar à mão.
- `scripts/fetch_catalog.py`: gera o arquivo. Uma requisição por vez, com pausa.
- `src/data/seed.ts`: junta o catálogo às ofertas sintéticas e cria as turmas `catalog`.
- Testes: `src/domain/catalog.test.ts`, `src/features/offerings/catalog.test.ts`.

## Como atualizar

```powershell
python scripts/fetch_catalog.py               # baixa para um diretório temporário e regenera
python scripts/fetch_catalog.py --cache DIR   # reaproveita páginas já baixadas
```

Antes de versionar: conferir o resumo impresso (cursos, turmas, selos) contra a coleta anterior; rodar `npm test` (os testes de catálogo fixam contagens e podem precisar de revisão consciente); conferir se alguma oferta sintética ficou com turno que o curso não tem; atualizar as contagens e a data neste documento.

## Limites

- O site muda sem aviso. As contagens acima valem para 12/11/2026.
- "Nutrição 360º" na página do curso corresponde ao cartão "Nutrição" da listagem.
- O turno de Semipresencial, Presencial Intensivo, EAD e EAD Live é convenção do sistema.
- Unidade/polo não vem do site; o catálogo não diz em qual campus cada turma abriria.
- Não há confirmação institucional de que o site reflete as ofertas da próxima entrada.

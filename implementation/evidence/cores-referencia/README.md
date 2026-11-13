# Cores conforme a referência do usuário

11/11/2026. O usuário forneceu uma imagem de dashboard com branco, cinza frio, carvão e azul claro. Esta rodada substitui os tons quentes da revisão anterior. A imagem fornecida mostra o claro; o escuro foi derivado da mesma linguagem.

## Aplicação

- Claro: fundo `#f5f6f8`, superfícies brancas, navegação `#343638`, destaque azul `#8bbbea`.
- Escuro: fundo `#202328`, superfícies `#292d33`, navegação `#181a1e`, mesmo azul de destaque.
- Texto escuro sobre os botões azuis para manter leitura. A marca Anchieta original continua preservada.
- Painéis com raio de 20 px, sombra leve, controles arredondados e etiquetas de estado suaves. Nenhuma mudança nas regras de negócio ou nos percursos.

## Verificado

`npm run typecheck`, `npm run lint`, `npm test` (**26 aprovados**), `npm run build` e `npm run test:e2e` (**14 aprovados**, aproximadamente 1,3 minuto). Detector mecânico sobre os arquivos visuais alterados: `[]`. O build mantém o aviso conhecido de tamanho do chunk principal.

`node scripts/inspect-simplification.mjs implementation/evidence/cores-referencia` gerou [inspecao-renderizada.json](inspecao-renderizada.json): quatro entradas × dois temas, 508 nós de texto medidos, nenhuma falha de contraste no recorte. Limiares: 4,5:1 para texto normal e 3:1 para texto grande. Não é uma auditoria WCAG completa; o script não mede todos os SVGs, placeholders e estados transitórios.

## Capturas reais

| Tela | Claro | Escuro |
|---|---|---|
| Gestão | [Entrada](entrada-gestao-light.png) | [Entrada](entrada-gestao-dark.png) |
| Consultor | [Entrada](entrada-consultor-light.png) | [Entrada](entrada-consultor-dark.png) |
| Suporte | [Entrada](entrada-suporte-light.png) | [Entrada](entrada-suporte-dark.png) |
| Financeiro | [Entrada](entrada-financeiro-light.png) | [Entrada](entrada-financeiro-dark.png) |
| Atendimento | [Tela](atendimento-light.png) | [Tela](atendimento-dark.png) |
| Devolução | [Tela](devolucao-light.png) | [Tela](devolucao-dark.png) |

[Atendimento mobile](atendimento-mobile.png). Dados integralmente sintéticos. Nenhum resultado de usabilidade com usuários ou ganho operacional é inferido dessas capturas.

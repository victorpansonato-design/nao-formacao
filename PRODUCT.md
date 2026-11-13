# Continua

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Revisão de 12/11/2026: **Diretoria/Gestão** (perfil único) cadastra se cada turma é ofertada, acompanha a operação no painel e aprova descontos acima da alçada do consultor; **Consultores** atendem os alunos e confirmam a troca feita no Lyceum; **Suporte** executa ajustes e regularizações; **Admin técnico** configura a demonstração. Não há perfil Financeiro: devoluções correm em outro sistema.

Confirmado pelo usuário: **cada perfil deve entrar vendo suas próprias pendências e uma próxima ação clara**. Primeiras telas: Diretoria/Gestão → Painel; Consultor → Atendimentos; Suporte → Ajustes acadêmicos; Admin → Configurações. As demais áreas continuam acessíveis.

## Product Purpose

Registrar quais turmas (curso + modalidade + turno) são ofertadas, levar os alunos das não ofertadas direto aos consultores e acompanhar cada um até a troca confirmada no Lyceum ou o pedido de devolução encaminhado ao financeiro. O sistema deve orientar o trabalho sem exigir a leitura de explicações extensas.

## Capabilities and Constraints

SPA local em português. React/TypeScript, Vite, Tailwind, Radix, Zustand e comandos de domínio existentes. Catálogo de cursos real (site público, `docs/15-catalogo-real.md`); vagas, mensalidades e alunos sintéticos; relógio injetável, dinheiro em centavos, persistência versionada. Sem integrações reais.

Ofertado é Sim ou Não, sem análise nem aprovação. Destino ofertado, válido, com vaga e compatível é requisito de proposta. Interesse exige fonte e confirmação atual. Alçada única controla descontos (consultor até 5%, Diretoria/Gestão até 20%). Aceite não é efetivação. Pedido de devolução segue diretamente, sem negociação obrigatória; aqui só é registrado. Papéis e posse são simulações locais.

## Brand Commitments

Preservar a marca Grupo Anchieta e o azul institucional em pontos de reconhecimento. O usuário rejeitou a barra lateral inteiramente azul e o aspecto genérico de interface gerada. Após rejeitar também a proposta de tons quentes, enviou como referência vinculante um dashboard branco/cinza frio, navegação carvão, azul claro e etiquetas de estado suaves. Essa imagem passa a orientar as cores e o acabamento dos dois temas, como registrado em DESIGN.md.

## Product Principles

- Mostrar primeiro o trabalho pertinente ao papel e ao estado atual.
- Uma ação principal por tarefa; outras ações em pontos claros e próximos.
- Informação para decidir permanece disponível; explicações, referências e histórico entram sob demanda.
- Reduzir repetição sem remover regras, histórico ou funcionalidades.

## Evidence on Hand

Base sintética em `data/`, catálogo real em `src/data/catalog.ts`, contratos em `docs/`, marca em `src/assets/`, testes e capturas em `implementation/evidence/`. Não há resultado de piloto, previsão validada ou modelo treinado.

## Accessibility & Inclusion

Navegação por teclado, foco visível, nomes acessíveis, contraste medido nos dois temas, mobile e movimento reduzido. Nenhum atributo protegido, saúde ou vulnerabilidade pode orientar fila, preço ou recomendação.

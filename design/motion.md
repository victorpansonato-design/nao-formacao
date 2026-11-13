# Motion: continuidade perceptível

Este documento é a regra de movimento do Continua. Leia antes de criar ou alterar qualquer tela, componente ou interação. Se a implementação e este texto divergirem, corrija um dos dois na mesma entrega.

Revisão de 12/11/2026: substitui a proposta inicial pelo que está implementado e medido no app. O que ainda não foi feito está em "Limites conhecidos".

## 1. Princípio

Nada aparece, some ou muda de lugar em um único quadro. Toda mudança visível tem origem, percurso e destino, e termina em menos tempo do que o usuário leva para decidir o próximo clique.

O movimento existe para três coisas: mostrar de onde algo veio (popover nasce do botão), manter a orientação (o indicador desliza até a aba escolhida) e confirmar que a ação teve efeito (o erro abre espaço, o ícone vira "copiado"). Fora disso, não anime.

Limites que valem sempre:

- O estado real vem primeiro. O comando persiste e a animação acompanha o resultado; nenhuma animação sugere confirmação antes de autorização ou verificação.
- Nenhuma animação atrasa a regra de negócio nem bloqueia o próximo clique.
- Movimento reduzido tem precedência sobre qualquer preferência por animação.

## 2. Qual ferramenta usar

Escolha a primeira linha que resolve o caso. Não combine duas para o mesmo efeito.

| Preciso de… | Use | Onde está |
|---|---|---|
| Hover, foco, press, seleção | Nada: a regra global já cobre `a`, `button`, `summary`, `input`, `select`, `textarea`, `[role=button\|link\|tab]` | `src/app/styles.css` (`@layer base`) |
| Conteúdo que passa a existir (rota, painel de aba, resultado) | Classe `motion-enter` | `src/app/styles.css` |
| O mesmo, dentro de algo que já entra animado | Classe `motion-fade` | `src/app/styles.css` |
| Diálogo, gaveta, popover, menu, tooltip | Primitivas `Dialog`, `Sheet`, `Popover`, `Menu`, `Tooltip` (já animadas) | `src/shared/ui/overlays.tsx` |
| Expansão simples de texto ou lista | `<details>` nativo ou `Disclosure` | `src/shared/ui/primitives.tsx` |
| Bloco condicional no meio do fluxo (erro, aviso, seção opcional) | `<Reveal show={…}>` | `src/shared/motion` |
| Trocar ícone ou rótulo curto no mesmo lugar | `<Swap id={…}>` | `src/shared/motion` |
| Indicador que desliza entre opções | `motion.span` com `layoutId` e `SPRING_SLIDE` | ver `tabs.tsx`, `Sidebar.tsx` |
| Item que entra/sai de uma lista curta | `AnimatePresence` + variantes `fadeRise` | `src/shared/motion` |
| Barra de proporção | `Meter` ou classe `motion-meter` | `primitives.tsx`, `analytics/parts.tsx` |
| Gráfico | Animação do Recharts, desligada com `prefersReducedMotion()` | `OfferingChart.tsx` |
| Número de indicador | `<CountUp value>` | `src/shared/motion` |
| Gráfico de rosca (parte do todo) | `<Donut segments label>` | `src/shared/motion` |
| Lista curta que entra com um painel de dados | Classe `motion-stagger` no contêiner (até 8 itens, só opacidade) | `src/app/styles.css` |

Ordem de preferência: CSS, depois Motion for React. CSS roda fora da thread principal e continua fluido com a tela ocupada; Motion entra só onde CSS não alcança (altura automática com saída, `layoutId`, troca com presença).

View Transitions fica restrita à troca de tema. Não usar `<ViewTransition>` do React nem a prop `viewTransition` do React Router para rotas: filtros e abas deste app vivem na URL, então cada tecla de busca dispararia um crossfade da tela inteira; a página não recebe cliques durante a transição; e o React não anima voltar/avançar do navegador. A entrada por CSS vale igual para todos os caminhos.

## 3. Tokens

Fonte de verdade: `design/tokens.css` (CSS) espelhado em `src/shared/motion/index.ts` (JS). Não escreva duração ou curva literal em componente; se nenhum token serve, a animação provavelmente está errada.

| Token CSS | Valor | Constante JS | Uso |
|---|---|---|---|
| `--duration-fast` | 120 ms | `T_FAST` | hover, foco, press, toda saída de overlay |
| `--duration-base` | 200 ms | `T_BASE` | entrada de overlay, rota, painel de aba, troca de ícone |
| `--duration-panel` | 280 ms | `T_PANEL` | expansão de altura, saída de gaveta |
| `--duration-drawer` | 360 ms | — | entrada de gaveta |
| `--duration-data` | 500 ms | `T_DATA` | barras, medidores e número que vai do valor anterior ao novo |
| `--duration-theme` | 450 ms | — | preenchimento do tema |
| `--duration-data-intro` | 900 ms | `T_DATA_INTRO` | entrada de painel de dados: contagem a partir de zero e varredura da rosca |
| `--stagger-step` | 40 ms | — | intervalo entre itens de `motion-stagger` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | `EASE_OUT` | tudo que entra, sai ou responde a uma ação |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | `EASE_IN_OUT` | algo que já está na tela e se desloca |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | — | gavetas |
| — | mola `visualDuration 0.25, bounce 0.12` | `SPRING_SLIDE` | indicadores com `layoutId` |
| — | mola `visualDuration 0.3, bounce 0` | `SPRING_LAYOUT` | itens que cedem lugar (pilha de avisos) |

As utilidades `transition-*` do Tailwind herdam `--duration-fast` e `--ease-out` por padrão (`--default-transition-*` em `styles.css`). Para outra duração, use o token: `duration-(--duration-base)`.

Regras de escala:

- Interface comum fica abaixo de 300 ms. Só gaveta, dados e tema passam disso.
- Saída é mais curta que entrada.
- Nunca `ease-in` em interface: começa devagar e parece lento.
- Nunca `linear`, exceto em opacidade de fundo se necessário.

## 4. Regras obrigatórias

1. **Animar só `opacity`, `transform`, `scale`, `translate`, `filter`.** Não animar `width`, `height`, `top`, `left`, `margin`, `padding`. Exceções: altura automática de bloco pequeno via `Reveal` ou `<details>`; largura da navegação ao recolher (`.app-sidebar`, um elemento, em resposta a clique, 200 ms), porque o painel do conteúdo precisa ocupar o espaço liberado.
2. **Listar as propriedades.** Nunca `transition: all` nem `transition-all`.
3. **Origem física.** Popover, menu e tooltip escalam a partir do gatilho (`motion-pop` lê `--radix-*-content-transform-origin`). Diálogo cresce do próprio centro. Gaveta percorre a própria largura a partir da borda.
4. **Nunca partir de `scale(0)`.** Entrada começa em 0,96; saída termina em 0,97. Press de botão: 0,97.
5. **Toda entrada tem saída.** Overlay Radix: animação em `[data-state=closed]`. React: `AnimatePresence`. Sem isso o elemento teleporta ao fechar.
6. **Interrompível.** Clicar de novo no meio da animação redireciona a partir do ponto atual. Transições CSS e molas do Motion fazem isso; `@keyframes` encadeados com `delay` não. Não usar `animation-delay` nem sequência coreografada em resposta a clique.
7. **Não animar o que o teclado repete.** Realce de item em menu e na busca global acompanha a seta sem transição. Resultado de busca digitada não anima a cada tecla.
8. **Não animar listas grandes.** Tabela troca o corpo com fade ao paginar ou ordenar; linhas não deslizam uma a uma. Sem `layout` em dezenas de itens, sem entrada escalonada.
9. **Reservar espaço.** `scrollbar-gutter: stable` já está aplicado; fallback de rota tem a altura da tela; manter `key` por ID; mover o foco só depois que a região existe.
10. **Posição no Tailwind 4 usa `translate`, não `transform`.** Em `@keyframes` de elemento centralizado com `-translate-x-1/2`, anime `scale`/`opacity` e não reescreva `transform: translate(...)`: isso soma ao centro e o elemento voa na entrada (defeito corrigido nesta revisão).
11. **`borderRadius` em `style`** em elementos com `layoutId` ou `layout`, para o Motion corrigir a distorção do raio durante a escala.
12. **Uma animação por mudança.** Não aninhar `motion-enter` dentro de `motion-enter` (os deslocamentos somam); dentro, use `motion-fade`.
13. **Nada em loop** e nada que comece sozinho, exceto indicador de carregamento.

## 5. Catálogo do que existe

| Interação | Comportamento | Implementação |
|---|---|---|
| Hover/foco de controle | cor, borda e sombra em 120 ms | regra global em `styles.css` |
| Press de botão | escala 0,97 em 120 ms, volta ao soltar | `button.tsx` |
| Troca de rota | conteúdo entra com opacidade + 6 px em 200 ms; navegação e barra superior ficam paradas; rolagem volta ao topo antes da pintura | `Shell.tsx` (`motion-enter` + `useLayoutEffect`) |
| Item ativo da navegação | pílula clara única desliza entre itens | `Sidebar.tsx` (`layoutId` por instância, `layoutScroll` no contêiner; ativo calculado com `useMatch`, porque o `Tooltip` envolve o link com Slot) |
| Hover na navegação | a mesma pílula clara surge por cor de fundo em 120 ms, sem deslocamento | `Sidebar.tsx` (classe `row`, regra global de transição) |
| Recolher a navegação | coluna estreita até o trilho de ícones (largura, 200 ms, `--ease-in-out`); rótulos apagam em 120 ms antes do corte e voltam 60 ms depois; a marca encolhe para 40 px por `scale`/`translate`; o painel do conteúdo ocupa o espaço no mesmo ritmo. No trilho, cada item ganha dica à direita | `.app-sidebar`, `.nav-label`, `.nav-logo` em `styles.css`; botão na `Topbar`; preferência `sidebarCollapsed` |
| Linha amarela | cresce da esquerda (`scale` 0,2 → 1 e opacidade) em 280 ms, junto com a tela; não reage a clique | utilidade `accent-rule`; `PageHeader`, painel da gestão, `WorkCue` |
| Abas e filtro segmentado | indicador desliza; painel novo entra com `motion-enter` | `tabs.tsx`; painéis nas telas |
| Diálogo e busca global | fundo com fade; caixa escala 0,96 → 1; saída em 120 ms | `overlays.tsx`, `CommandPalette.tsx` |
| Gaveta | desliza a largura inteira, 360 ms entra / 280 ms sai | `overlays.tsx` (`motion-sheet-*`) |
| Popover e menu | escala a partir do gatilho, com saída | `overlays.tsx` (`motion-pop`) |
| Tooltip | o primeiro abre com atraso e animação; os seguintes abrem na hora, sem animação | `overlays.tsx` (só `delayed-open` anima) |
| Expansão `<details>` | altura e opacidade contínuas, seta gira | `styles.css` (`::details-content` + `interpolate-size`) |
| Erro de comando | abre espaço com altura contínua; recolhe mantendo o texto até o fim | `CommandError` em `feedback.tsx` (`Reveal`) |
| Erro de campo | com texto de ajuda, ocupa o lugar dele com fade; sem ajuda, abre a linha com `Reveal` | `Field` em `primitives.tsx` |
| Aviso (toast) | entra pela borda inferior; os demais cedem lugar; sai encolhendo | `feedback.tsx` (`popLayout` + `toastMotion`) |
| Copiar | ícone troca no lugar com escala e desfoque | `CopyButton` (`Swap`) |
| Interruptor | trilho muda de cor, botão desliza em 200 ms | `Switch` em `primitives.tsx` |
| Paginação/ordenação de tabela | corpo troca com fade | `data-table.tsx` (`key` + `motion-fade`) |
| Medidor e barra | cresce da esquerda por `translateX`, 500 ms | `motion-meter` |
| Linha de continuidade | marcador e conector mudam de cor em 200 ms | `continuity-line.tsx` |
| Gráfico | interpolação do Recharts, 350–400 ms | `OfferingChart.tsx`, `RevenueCalculator.tsx` |
| Tema | preenchimento circular a partir do botão "Tema escuro/claro" no rodapé da navegação, 450 ms | `runThemeTransition` em `shared/motion`; `ThemeItem` em `Sidebar.tsx` |
| Número de indicador | na montagem conta de zero até o valor em 900 ms; quando o dado muda, vai do número exibido ao novo em 500 ms, sem recomeçar. O valor final fica em texto para leitor de tela desde o primeiro quadro; movimento reduzido mostra o final de imediato | `CountUp` em `shared/motion/data.tsx` (props `value`, `format`, `className`) |
| Gráfico de rosca | na entrada, uma máscara varre o anel a partir do topo em 900 ms (`--ease-in-out`); depois, cada fatia desliza até o novo tamanho em 500 ms; fatias fora do foco atenuam em 120 ms. Anima `stroke-dashoffset`/`stroke-dasharray` de SVG, exceção à regra 1 restrita a este componente | `Donut` em `shared/motion/data.tsx` (props `segments`, `label`, `activeKey`, `onActiveChange`, `thickness`, `children`); classes `motion-donut-sweep` e `motion-donut-segment` |
| Entrada escalonada de lista curta | itens surgem só com opacidade, 280 ms, 40 ms de intervalo, até o 8º; apenas na entrada de painel de dados (rota), nunca em resposta a clique nem em tabela. Exceção declarada às regras 6 e 8 | classe `motion-stagger`; usada no painel da gestão (`features/dashboard`) |
| Diálogo de tela quase cheia | mesma entrada e saída do diálogo; ocupa 96 vw × 92 dvh e a lista rola por dentro | `Dialog size="full"` em `overlays.tsx`; `CatalogDialog.tsx` |

## 6. Como animar uma feature nova

Para cada elemento que muda na tela, responda nesta ordem:

1. **Ele já existe e só muda de aparência?** Transição CSS com token. Nada mais.
2. **Ele passa a existir porque o usuário navegou ou trocou de aba?** `motion-enter` no contêiner. Painel com `hidden`: a classe reinicia sozinha ao reaparecer. Painel condicional: `key` com o valor da aba.
3. **Ele aparece no meio de conteúdo que continua na tela?** `<Reveal show>`: quem está abaixo é empurrado aos poucos. Nunca `{cond ? <Bloco/> : null}` solto dentro de formulário ou painel.
4. **Ele flutua sobre a tela?** Use a primitiva de `overlays.tsx`. Não crie overlay novo com animação própria.
5. **Ele substitui outro no mesmo lugar?** `<Swap id>` para ícone; `AnimatePresence mode="wait"` com `fadeRise` para um bloco (exemplo em `TaskDetailPage.tsx`).
6. **Ele é um marcador de seleção?** `layoutId` + `SPRING_SLIDE`, id único por instância (`useId`).
7. **Ele é um número ou barra?** Barra: `Meter`/`motion-meter`. Número de indicador: `<CountUp>` (conta na entrada do painel e interpola quando o dado muda). Número em tabela ou texto corrido não anima.

Componente novo em `src/shared/ui` nasce com entrada, saída e movimento reduzido resolvidos, e ganha uma linha no catálogo acima.

Exemplos mínimos:

```tsx
// Bloco condicional no fluxo
<Reveal show={saldo < 0}><Callout tone="warning">Saldo insuficiente.</Callout></Reveal>

// Painel de aba que preserva estado
<div hidden={tab !== 'dados'} className="motion-enter">…</div>

// Painel de aba condicional
<div key={tab} className="motion-enter">{tab === 'a' ? <A /> : <B />}</div>

// Marcador que desliza
{active ? <motion.span layoutId={`${id}-mark`} transition={SPRING_SLIDE} style={{ borderRadius: 6 }} className="absolute inset-0 bg-surface" /> : null}
```

## 7. Tema com preenchimento

O botão informa o próximo tema, mantém o foco e guarda a preferência. `runThemeTransition` captura o centro do botão, calcula o raio até o canto mais distante, aplica o tema dentro de `document.startViewTransition` e anima o `clip-path` da camada nova. Durante a troca, `data-theme-switching` na raiz suspende as transições de cor, para o tema novo surgir já no estado final dentro do círculo. Cliques durante a transição são ignorados, não enfileirados. Sem a API, em falha ou com movimento reduzido, o tema é aplicado na hora.

## 8. Movimento reduzido

Vale a preferência do sistema (`prefers-reduced-motion`) ou a opção em Configurações → Preferências (`data-motion="reduced"` na raiz).

- CSS: os tokens de duração vão a zero e uma regra global encurta toda animação e transição.
- Motion: `MotionConfig` em `main.tsx` desliga transformações e layout; `Reveal` abre e fecha sem transição.
- Gráficos: `isAnimationActive={!prefersReducedMotion()}`.
- Tema: aplicado sem preenchimento.

Componente novo não precisa tratar o caso se usar tokens, classes `motion-*` e os componentes de `shared/motion`. Se usar Motion direto com altura, largura ou cor, consulte `useReducedMotionConfig()`.

## 9. Limites conhecidos

- Altura contínua de `<details>` depende de `interpolate-size` e `::details-content`. Confirmado no Chrome; a documentação do Chrome registra suporte a partir da versão 129 e, na época, ausência em Firefox e Safari. Não foi verificado o estado atual desses navegadores: neles a expansão deve abrir direto, sem quebrar.
- Blocos condicionais antigos que ainda não usam `Reveal` (avisos de estado em telas de detalhe) entram com fade, mas empurram o conteúdo abaixo de uma vez.
- Linhas de tabela não animam ao filtrar: a lista é substituída. É intencional (regra 8).
- Dentro de `flex` com `gap`, o `Reveal` adiciona o espaçamento do `gap` de uma vez ao abrir e ao fechar.
- O rótulo "Copiar → Copiado" troca sem animar a largura do botão.
- Números de indicadores interpolam apenas onde usam `CountUp` (painel da gestão). Os indicadores das demais telas (`Stat`, Resultados) ainda trocam de valor sem interpolação.
- Com o filtro Ofertados ou Não ofertados ativo no pop-up do catálogo, a turma alterada deixa a lista sem animação de saída.
- Voltar/avançar do navegador usa a mesma entrada de rota; não há animação de saída da tela anterior.

## 10. Verificação

Antes de concluir uma entrega com mudança visual:

- Abrir, fechar e reabrir rápido; clicar duas vezes; trocar de aba em sequência. Nada pode saltar, piscar ou ficar preso no meio.
- Fechar: o elemento sai animado, não some.
- Conteúdo abaixo de um bloco que aparece: desloca aos poucos.
- Teclado: foco visível, foco devolvido ao gatilho, realce de menu sem atraso.
- Tema claro e escuro; 390 px de largura; movimento reduzido ligado.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`. Os e2e rodam com movimento reduzido (`playwright.config.ts`); animação se confere à parte.

Medição desta revisão (12/11/2026, Chrome, 1440×1000 e 390×844, quadro a quadro com `getAnimations()` e `getBoundingClientRect()`): rota, indicador da navegação, indicador e painel de aba, busca global (entrada e saída), popover (origem `360px 0px`, no gatilho), press (1 → 0,97), `<details>` (42 → 320 px em passos contínuos, nos dois sentidos), gaveta (−232 → 0 px e volta), medidor e tema; nenhum erro de console. Typecheck e lint sem erros, domínio 26/26, e2e 14/14, build aprovado. Não é teste com usuários nem medição de taxa de quadros; outros navegadores não foram testados.

## 11. Fontes

Consultadas em 12/11/2026. Os valores deste documento são decisões de design apoiadas nelas, não tempos "cientificamente ideais".

- [Vercel — Web Interface Guidelines](https://vercel.com/design/guidelines): CSS antes de JS, só propriedades de composição, interrompível, origem física, nunca `transition: all`.
- [Emil Kowalski — 7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips) e [Great Animations](https://emilkowal.ski/ui/great-animations): press 0,97, não partir de escala 0, origem no gatilho, `ease-out`, abaixo de 300 ms, tooltips seguintes sem atraso, não animar ações de teclado.
- [Motion — Transitions](https://motion.dev/docs/react-transitions), [AnimatePresence](https://motion.dev/docs/react-animate-presence), [Layout animations](https://motion.dev/docs/react-layout-animations), [MotionConfig](https://motion.dev/docs/react-motion-config): molas por `visualDuration`/`bounce`, `popLayout`, `layoutId`, `layoutScroll`, movimento reduzido.
- [Radix — Collapsible](https://radix-ui.com/primitives/docs/components/collapsible) e código instalado de `@radix-ui/react-popover|dropdown-menu|tooltip`: saída por `data-state`, variáveis `--radix-*-content-transform-origin`.
- [Chrome — Animate to height: auto](https://developer.chrome.com/docs/css-ui/animate-to-height-auto) e [Styling details](https://developer.chrome.com/blog/styling-details): `interpolate-size`, `::details-content`.
- [React — ViewTransition](https://react.dev/reference/react/ViewTransition) e `node_modules/react-router/docs/how-to/view-transitions.md`: base da decisão de não usar View Transitions em rotas.
- Referências de efeito do tema: [Magic UI Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler), [Animate UI Theme Toggler](https://animate-ui.com/docs/primitives/animate-ui/theme-toggler).

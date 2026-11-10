# Motion: continuidade perceptível

## Princípio

Toda mudança de estado importante tem continuidade visual ou feedback claro. Isso não significa animar cada elemento ou impedir o usuário de trabalhar. Motion responde a uma ação, preserva orientação e nunca atrasa a regra de negócio.

Base: CSS para cor/foco/hover; Motion for React para presença, expansão e mudança de layout; View Transitions apenas no tema, com detecção e fallback. Não misturar três bibliotecas para o mesmo efeito. Valores abaixo são decisões de design propostas, não tempos “cientificamente ideais”.

| Interação | Referência técnica | Movimento proposto | Duração |
|---|---|---|---|
| Hover/press de botão | CSS e primitivas acessíveis | Cor e borda; press de 0,99 se apropriado | 100–140 ms |
| Menu/popover | shadcn + Motion presença | Opacidade e deslocamento de até 4 px | 140–180 ms |
| Troca de aba | Motion `layoutId` | Indicador desliza; conteúdo cruza sem salto | 180–220 ms |
| Abrir drawer | Motion `AnimatePresence` | Deslocamento lateral curto e backdrop suave | 240–300 ms |
| Expandir evidência CRM | Motion layout | Altura contínua, scroll preservado | 200–260 ms |
| Mudar filtro da tabela | Motion layout pontual | Itens entram/saem discretamente, sem embaralhar foco | 160–220 ms |
| Atualizar métrica | Number Ticker como referência | Interpolar apenas em atualização iniciada pelo usuário | 350–500 ms |
| Preencher formulário | CSS e progress | Foco, validação inline e etapa preenchida | 120–220 ms |
| Confirmar proposta | Motion presença | Resumo passa a confirmado, tarefa surge no fluxo | 200–300 ms |
| Atualizar gráfico | Recharts | Interpolar dados sem redesenho teatral | 300–450 ms |
| Trocar rota | CSS/Motion | Crossfade curto com título e posição estáveis | 160–220 ms |
| Copiar texto | Ícone e texto | Feedback próximo ao botão | 120–180 ms |
| Trocar tema | MDN + Magic UI/21st | Preenchimento circular a partir do botão | 400–500 ms |

## Tema com preenchimento

O botão informa o próximo tema, mantém foco e guarda preferência. Capturar origem no botão/clique; calcular raio até o canto mais distante; aplicar alteração do tema no callback de `document.startViewTransition`; animar o clip-path da camada adequada após `ready`. Não aplicar uma onda só ao ícone: o preenchimento deve cobrir toda a área visível.

No tema controlado, uma fonte de estado sincroniza atributo da raiz, preferência e acessibilidade. Bloquear apenas novos toggles durante transição curta ou coalescer cliques; não enfileirar cinco animações. Se API indisponível, falhar ou usuário preferir movimento reduzido, aplicar tema imediatamente com feedback legível. A preferência do sistema vale na ausência de escolha explícita.

Exemplos consultados: [Magic UI Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler), [21st Horizontal Theme Wipe](https://preview.21st.dev/%40arunachalam/components/theme-wipe-toggle), [Animate UI Theme Toggler](https://animate-ui.com/docs/primitives/animate-ui/theme-toggler). São referências de efeito/API; revisar licença e dependências antes de incorporar código.

## Redução de movimento

Respeitar `prefers-reduced-motion` e oferecer opção de interface. Remover deslocamentos, contadores rolantes, animação de gráfico e preenchimento circular; manter estado final imediato ou fade mínimo. Isso é uma escolha acessível intencional e tem precedência sobre a preferência geral por animação.

## Evitar saltos

Reservar altura de carregamento; usar `scrollbar-gutter: stable`; manter chave por ID; animar presença antes de desmontar; mover foco após a nova região ficar disponível; não animar tabela virtualizada inteira. Use `layout="position"` quando escala distorceria texto. Não animar `width/height` de centenas de itens ao mesmo tempo.

## Estado real vem primeiro

Comando de aceite bem-sucedido persiste uma vez; animação acompanha o resultado. Falha de validação preserva formulário e mostra motivo. Nenhuma animação sugere confirmação antes de autorização/verificação. A leitura por tecnologia assistiva anuncia o estado final, sem narrar cada frame.

## QA de motion

Testar interrupção, fechar/reabrir, troca rápida de abas, cliques repetidos, zoom, teclado e movimento reduzido. Confirmar ausência de flash no primeiro tema, perda de foco, rolagem para o topo e layout pulando ao aparecer erro. Guardar vídeo curto da implementação apenas depois de existir; este pacote não afirma ter validado animações no aplicativo ainda não construído.

# Pesquisa do ponto 56 — visual regression seletiva

**Data:** 2026-09-26  
**Estado:** recomendação aprovada pelo usuário em 2026-09-26; implementação ainda pendente.  
**Pergunta:** se o Polaris deve adotar comparações visuais, em quais telas e com qual ferramenta, mantendo poucos baselines confiáveis.

## Conclusão provisória

A direção do relatório está correta: usar as assertions nativas do Playwright em poucas superfícies de alto impacto e não introduzir agora uma plataforma SaaS de visual testing. O Polaris já usa Playwright para E2E, mas não tem comparação visual. Não encontrei Storybook, Chromatic ou Percy no repositório.

**Refinamento recomendado:** aprovar a política agora, mas criar os primeiros baselines depois da revisão de `DESIGN.md` do P35 e da estabilização das telas escolhidas. O P35 identificou divergências entre o contrato visual atual e o código; congelar pixels antes de reconciliá-las criaria churn de snapshots e incentivaria atualizações que apenas acompanham uma UI ainda em mudança.

Depois dessa estabilização, começar com um conjunto pequeno: login Web, shell/dashboard Web, uma tela representativa de produtos ou uma etapa visual crítica da venda, e shell do Admin. Adicionar estado de billing somente se ele fizer parte do lançamento e seu conteúdo puder ser reproduzido com fixtures sintéticas. Evitar snapshot de cada passo de um fluxo e páginas inteiras com dados voláteis.

## Auditoria no Polaris

- `@playwright/test` está declarado como `^1.61.1` e resolvido a `1.61.1` em `bun.lock`.
- `apps/web/playwright.config.ts` e `apps/admin/playwright.config.ts` cobrem E2E dos dois apps. Ambos usam Chromium na CI; `.github/workflows/ci.yml` instala Chromium com `playwright install --with-deps`.
- A CI roda em `ubuntu-latest`. O ambiente local do usuário é Windows. Isso é relevante: os próprios arquivos baseline podem variar por sistema operacional, fontes e versão/configuração do browser.
- Não existem chamadas `toHaveScreenshot`, diretórios de golden snapshots, `snapshotPathTemplate` ou scripts de atualização visual. Não há Storybook, Chromatic ou Percy nos arquivos versionados.
- As jornadas E2E já fornecem lugares naturais para selecionar estados visuais: login e dashboard em `apps/web/tests/e2e/shell.e2e.ts`, venda e operações em `apps/web/tests/e2e/operations.e2e.ts`, e autenticação/dashboard interno em `apps/admin/tests/e2e/admin-access.e2e.ts`. Esses testes são funcionais hoje, sem asserções visuais.
- `DESIGN.md` existe, mas sua revisão e reconciliação com o CSS e os componentes foi aprovada no P35 e ainda deve preceder a aceitação de baselines como representação visual desejada.
- O Hub é uma referência para contrato de design e workflow Playwright, mas uma busca por `toHaveScreenshot`, `snapshotPathTemplate`, Chromatic e Percy não encontrou adoção de visual regression. Não há baseline visual do Hub a copiar.

## O que o Playwright nativo oferece

`expect(page).toHaveScreenshot()` cria uma imagem de referência na primeira execução e compara execuções seguintes. A comparação usa `pixelmatch`. O matcher espera duas capturas consecutivas idênticas antes de avaliar o baseline, reduzindo ruído de renderização transitória; a página precisa, ainda assim, chegar ao estado de negócio correto antes da captura. O padrão de animação para essa assertion é `disabled`, e o cursor é ocultado. A documentação alerta que OS, versões, configurações, hardware e modo headless podem alterar a renderização; recomenda executar no mesmo ambiente em que os baselines foram criados. O nome do snapshot separa browser/plataforma, ou usa o nome do projeto quando configurado com projetos Playwright. [Visual comparisons](https://playwright.dev/docs/test-snapshots), [PageAssertions](https://playwright.dev/docs/api/class-pageassertions).

Os arquivos de baseline ficam no diretório de snapshots ao lado do teste e devem ser versionados e revisados. Atualizações são explícitas via `--update-snapshots`; uma execução comum não deve ser usada para aceitar diferenças automaticamente. Para cada atualização intencional, a revisão deve conferir o diff de imagem, a causa da mudança e os snapshots removidos/adicionados no mesmo PR da mudança de UI. [Visual comparisons](https://playwright.dev/docs/test-snapshots).

Há dois controles diferentes de comparação: `threshold` tolera diferença perceptual de cor por pixel (padrão 0,2 em YIQ); `maxDiffPixels`/`maxDiffPixelRatio` permitem um total/proporção de pixels divergentes, sem limite global configurado por padrão. Não recomendo elevar tolerâncias globais preventivamente: isso pode esconder regressões localizadas. Começar estrito e abrir exceção pequena e documentada somente quando o diff demonstrar ruído inevitável. [PageAssertions](https://playwright.dev/docs/api/class-pageassertions).

`stylePath` ou `mask` podem estabilizar um elemento externo volátil, mas também podem ocultar exatamente a regressão que a captura deveria detectar. Preferir fixtures determinísticas; mascarar apenas elementos realmente imprevisíveis, com escopo pequeno e justificativa. Playwright também captura efeitos hover que estejam ativos, então os testes devem colocar o ponteiro em estado neutro quando isso importar. [Visual comparisons](https://playwright.dev/docs/test-snapshots), [PageAssertions](https://playwright.dev/docs/api/class-pageassertions).

## Determinismo e fluxo de baselines recomendados

1. **Uma plataforma de referência no começo:** Chromium em Linux, que já é o browser usado pela CI. Não gerar nem atualizar os baselines no Windows local. Não compartilhar baseline entre Chromium, Firefox/WebKit ou sistemas operacionais; se outros browsers forem introduzidos na matriz, cada um precisa de baseline e finalidade próprios.
2. **Runtime reproduzível:** fixar o ambiente em que baselines são criados e comparados. A documentação oficial oferece imagens Docker com browsers e dependências do sistema e recomenda mantê-las compatíveis com a versão instalada do Playwright. Para Polaris, usar uma imagem/container com a mesma versão do pacote e do browser é a opção mais reproduzível; deve ser avaliada na implementação, porque hoje CI usa `ubuntu-latest` e instala browser no runner. Se container não for viável, estabelecer explicitamente a CI Linux como única autoridade de geração/atualização e transportar os novos arquivos como artifact para commit. [Playwright Docker](https://playwright.dev/docs/docker), [Visual comparisons](https://playwright.dev/docs/test-snapshots).
3. **Estado visual repetível:** seed e usuário E2E fixos; viewport e `deviceScaleFactor` explícitos; locale/timezone e tema explícitos; textos, datas, valores e ordenação estáveis; esperar fontes/imagens e o estado carregado correto; não depender de terceiros/rede ao capturar. Congelar relógio ou mascarar pequenas informações dinâmicas só quando necessário. Manter `animations: disabled`; não tentar fazer um screenshot durante skeleton, carregamento ou transição.
4. **Pequenas capturas nomeadas:** selecionar screenshot de viewport/locator que capture uma responsabilidade visual; usar nomes descritivos; evitar dezenas de snapshots por tela e snapshots de tabelas completas se algumas linhas determinísticas forem suficientes.
5. **Atualização auditável:** atualizar snapshots somente depois de uma alteração de UI intencional; revisar os diffs visualmente; versionar a mudança junto ao código; exigir explicação do que mudou e por que o novo baseline é correto. Nunca rodar `--update-snapshots` como rotina de CI ou para fazer um teste vermelho passar sem triagem.
6. **Falhas e privacidade:** usar apenas contas e dados sintéticos nos testes. Falhas visuais podem aproveitar o artifact E2E failure-only e sete dias já aprovado no P55; não incluir dumps, secrets ou dados reais. Não gerar screenshots de produção como baseline.
7. **Complementaridade:** manter assertions funcionais e a verificação de acessibilidade aprovadas em P36. Pixel match não verifica semântica, conteúdo correto, navegação por teclado nem qualidade de design. Ele encontra alterações na renderização dos estados capturados; não prova que a tela está correta ou que outros estados estão cobertos.

### Quando começar

O critério para estabelecer baselines não deve ser “o sistema inteiro está pronto”. Começar assim que (a) as regras de layout/tema relevantes do P35 tiverem sido reconciliadas, (b) as telas selecionadas tiverem conteúdo de fixture reproduzível e (c) a equipe conseguir gerar imagens no mesmo runtime da CI. Antes disso, implementar o harness adicionaria manutenção sem dar uma referência visual confiável. Após o primeiro conjunto, expandir somente quando um bug visual escapar ou uma área crítica mudar com frequência suficiente para justificar cobertura.

## Playwright local versus SaaS

| Opção | Benefícios | Custos/limites para o Polaris |
|---|---|---|
| **Playwright `toHaveScreenshot`** | Já está instalado e integrado aos E2E; baselines em Git e sem conta/serviço adicional; falha localmente quando imagem muda ou falta. | Comparação depende de ambiente/browser/fonts; diffs binários precisam de revisão no Git/artefato; manutenção de baselines e redução de flakiness ficam com o projeto. |
| **Chromatic** | Integra-se com Playwright e fornece review visual cloud, histórico ligado a commits, diffs e captura paralela gerenciada. | Novo fornecedor, token, fluxo de PR e avaliação de plano/limites; a integração arquiva e envia DOM, CSS e assets da página para a nuvem. Não há Storybook no Polaris, e a pequena seleção pretendida não justifica a infraestrutura agora. Pode ser reavaliado quando existir necessidade clara de revisão visual centralizada ou escala de snapshots. [Chromatic Playwright](https://www.chromatic.com/docs/playwright/), [visual testing](https://www.chromatic.com/docs/visual/). |
| **Percy** | A integração oficial aceita assertions Playwright `toHaveScreenshot`, mantém baseline/build em nuvem e oferece revisão/aprovação e comparações consistentes sem depender do SO local. | Novo serviço, token, config, status/revisão e envio de screenshots; o pipeline não falha automaticamente por diferença sem configurar o gate de espera/aprovação. Exige avaliação de plano, acesso e dados antes da adoção. [Percy com `toHaveScreenshot`](https://www.browserstack.com/docs/percy/references/playwright-tohavescreenshot), [approval workflow](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/approval). |

Chromatic e Percy resolvem melhor a revisão distribuída, baseline cloud e diversidade de browser; ambos transferem evidência visual para um fornecedor. A sensibilidade concreta depende do que as fixtures renderizam, mas, em um ERP, conteúdo empresarial pode aparecer em DOM/imagens. Portanto, qualquer SaaS exigiria dados sintéticos e análise de retenção/acesso antes de conectar a CI. Para o conjunto pequeno do P56, Playwright nativo tem melhor relação simplicidade/controle; não presumo disponibilidade de plano pago ou gratuito como premissa da decisão.

## Relatos de praticantes

As discussões públicas consultadas são anedóticas, não uma amostra representativa nem fonte normativa. Elas ilustram dois riscos operacionais que também aparecem nos avisos oficiais do Playwright: conteúdo variável e diferenças de renderização geram falsos positivos; e o custo humano de revisar imagens em muitos PRs pode superar o valor do teste. Participantes discordam sobre se screenshots devem bloquear releases, mas relatos favoráveis condicionam o gate a determinismo e cobertura pequena de fluxos críticos. Outra discussão aponta que baselines versionados no Git funcionam bem em escopo pequeno, enquanto milhares de imagens e review distribuído favorecem armazenamento/review especializados. Isso reforça começar com poucas telas reprodutíveis e só adicionar serviço quando volume ou workflow provar essa necessidade. [Discussão sobre flakiness e gates](https://www.reddit.com/r/Everything_QA/comments/1s2yl0e/how_do_you_deal_with_visual_regression_flakiness/), [discussão sobre escala e review de baselines](https://www.reddit.com/r/Playwright/comments/1vv8jrj/how_to_scale_visual_tests/), [discussão sobre ambiente reprodutível](https://www.reddit.com/r/Playwright/comments/1qbpu8t/consistent-visual-assertions-via-playwright/).

## Recomendação para P56

- **Aprovar** visual regression seletiva com Playwright nativo e `toHaveScreenshot`, sem Chromatic/Percy no início.
- **Condicionar a criação das baselines** à conclusão do refinamento visual do P35 e ao runtime canônico reproduzível; registrar a política agora para não atrasar o restante da fundação.
- Começar por poucas vistas da jornada de lançamento: login Web, shell/dashboard Web, uma tabela/etapa representativa de venda e shell Admin. Incluir billing somente se estiver no escopo do lançamento e houver fixture estável. Reusar as jornadas E2E existentes quando possível.
- Usar Chromium/Linux no primeiro ciclo, snapshots commitados em Git, geração/atualização explícita em ambiente canônico e review de cada diff. Não ajustar tolerâncias globais para acomodar deriva do ambiente.
- Expandir, trocar ferramenta ou incluir outros browsers depois de evidência de necessidade: falhas visuais escapadas, volume/conflito de baselines, demanda de review cloud ou cobertura cross-browser.

## Limitações

Auditoria limitada ao checkout versionado e aos arquivos locais do Hub acessíveis. Não executei testes, gerei screenshots, abri browsers/URLs locais, inspecionei contas SaaS, preços/planos, configuração remota do GitHub ou dados de E2E. O runtime de CI atual é configurado como `ubuntu-latest`; sua imagem concreta muda fora do repositório. Fontes oficiais consultadas em 2026-09-26.

# Pesquisa do ponto 55 — artefatos úteis de E2E

**Data:** 2026-09-26  
**Estado:** recomendação aprovada pelo usuário em 2026-09-26; implementação ainda pendente.  
**Pergunta:** quais evidências Playwright devem ser preservadas quando E2E falha na CI, por quanto tempo e com quais limites de privacidade?

## Conclusão provisória

P55 está correto em buscar evidências que permitam investigar falhas sem reproduzi-las imediatamente. Recomendo produzir artefatos separados para Web e Admin, somente quando o respectivo job E2E falhar, com trace e screenshot dos testes que falharam, relatório Playwright e logs de servidor estritamente necessários. Configurar retenção de **7 dias** para esses artefatos. Usar somente dados sintéticos e banco E2E não produtivo; nunca incluir dados reais, secrets, arquivos `.env`, dumps, ou logs indiscriminados.

O trace do Playwright pode conter snapshots completos do DOM, screencast, logs de ações, requisições e respostas de rede, incluindo headers e corpos. Para um ERP, isso pode revelar dados pessoais e empresariais, conteúdo financeiro, identificadores de sessão e informação interna. A documentação do Playwright recomenda enviar traces e relatórios apenas a armazenamento confiável ou cifrá-los. O artifact privado do GitHub atende ao fluxo de inspeção pela equipe autorizada, mas qualquer pessoa com acesso de leitura ao repositório pode baixá-lo; “privado” não significa acesso exclusivo ao dono.

## Auditoria no Polaris

- `.github/workflows/ci.yml` tem jobs independentes `e2e` e `admin-e2e`, com URLs de banco E2E separadas em secrets e credenciais OAuth dummy. Não há upload de relatório, trace, screenshot, vídeo ou log desses jobs. As credenciais de produção aparecem em outros jobs operacionais de `workflow_dispatch`, não nos dois jobs E2E.
- `apps/web/playwright.config.ts` e `apps/admin/playwright.config.ts` já configuram `retries: process.env.CI ? 2 : 0` e `trace: "on-first-retry"`. Não configuram screenshot, vídeo, reporter HTML ou retenção de artifact.
- Como os configs não definem `reporter`, Playwright usa `dot` na CI e `list` fora dela por padrão; não há contrato explícito garantindo um HTML report para upload.
- `createE2eServerEnv` em `packages/e2e-support/src/index.ts` substitui `DATABASE_URL` pelo `E2E_DATABASE_URL`, mas começa com spread de todo o `process.env`. Portanto, a proteção principal é não expor secrets de produção ao job E2E; o job atual só injeta a URL do banco E2E e credenciais OAuth dummy.
- O contrato E2E já exige um banco explicitamente isolado (`E2E_DATABASE_URL`); a evidência de traces deve continuar ligada somente a esse ambiente. O dado persistido nas evidências depende, porém, do que testes e fixtures gravarem nesse banco.

## Fontes oficiais atuais

- Playwright, [Test use options](https://playwright.dev/docs/test-use-options): screenshots aceitam `only-on-failure`; trace e video suportam `retain-on-failure`, mantendo arquivos dos runs que falharam e descartando os de runs aprovados. O modo grava por tentativa; com retries, múltiplas tentativas falhas podem gerar múltiplos arquivos.
- Playwright, [Trace Viewer](https://playwright.dev/docs/trace-viewer): trace mostra DOM snapshots, screencast/screenshot, logs de ações, requisições, headers, request/response bodies. O Trace Viewer web processa localmente no browser sem transmitir os dados; isso não altera o acesso/risco do arquivo previamente enviado como artifact.
- Playwright, [Continuous Integration](https://playwright.dev/docs/ci): exemplo de relatório/artifact de CI; a documentação alerta que reports e traces devem ser enviados apenas a artifact stores confiáveis ou cifrados antes do upload.
- Playwright, [Web server](https://playwright.dev/docs/test-webserver): stdout do servidor é ignorado por padrão e stderr é encaminhado; logs podem ser capturados de forma mais ampla alterando configuração. Coletar logs de servidor deve ser intencional e limitado, em vez de copiar saídas gerais do runner.
- GitHub, [Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts) e [download de artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts): artifacts persistem dados produzidos por um run; quem tem acesso de leitura ao repositório pode baixar. Apagar o run também remove os artifacts associados.
- GitHub, [Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data): `actions/upload-artifact` aceita `retention-days`; o valor configurado não pode exceder a retenção permitida no repositório/organização/enterprise. A página exemplifica retenção curta de 5 dias.
- GitHub, [Configurar retenção de artifacts e logs](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization): por padrão logs e artifacts ficam 90 dias; em repositórios privados a política pode variar de 1 a 400 dias, sujeita a limites superiores. Retenção por artifact não altera retroativamente objetos existentes. Os limites de retenção de logs são configuração distinta da retenção individual de artifact.
- GitHub, [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) e [Secrets reference](https://docs.github.com/en/actions/reference/security/secrets): redaction automática aplica-se a logs e depende de valores exatos; transformações e dados estruturados podem escapar da máscara. Essas garantias não são uma política de sanitização para traces/arquivos binários. A conclusão de não confiar em masking para limpar artifacts é uma inferência operacional; evitar dados sensíveis é o controle adequado.

## Recomendação para P55

1. Em cada job E2E, configurar trace com retenção apenas nas tentativas que falharam (`retain-on-failure`) e screenshot (`only-on-failure`). Preservar retries atuais; aceitar que uma falha transitória que passou no retry não gera artifact se o job terminar aprovado e a política for estritamente failure-only.
2. Manter vídeo desligado no baseline. O trace já inclui screencast/snapshots por padrão; vídeo duplicaria evidência e volume. Habilitar video (`retain-on-failure`) seletivamente se uma classe real de falhas não puder ser diagnosticada pelo trace.
3. Configurar explicitamente um HTML report em CI e enviar report + `test-results` do app correspondente em artifacts separados, com nomes que identifiquem Web/Admin e run. Executar upload em caso de falha do job; não enviar em sucesso ou cancelamento. Limitar os paths às saídas de Playwright e aos logs curados do app, sem incluir workspace, `.next`, `.env*`, dumps ou pastas genéricas de logs.
4. Definir `retention-days: 7` no upload individual. Isso dá uma janela de triagem curta e não muda a política global dos logs de Actions.
5. Usar apenas organização, usuários, produtos e transações fictícios/reprodutíveis, em bancos E2E não produtivos. Manter secrets E2E mínimos e separados; nenhum secret de Production no job, mesmo que GitHub faça masking nos logs. Não anexar dados reais a reports, screenshots, traces ou logs.
6. Tratar artifact do GitHub como evidência privada com acesso de leitura do repositório, não como storage público nem arquivo de auditoria durável. Não compartilhar traces via URLs acessíveis publicamente ou serviços externos sem nova avaliação de dados.

## Limitações

Esta auditoria foi do checkout e da configuração versionada; não consultou as definições remotas do GitHub Actions, permissionamento real dos colaboradores, conteúdo de banco E2E ou histórico de artifacts. Nenhum código foi alterado e nenhum teste foi executado. Os links de documentação são fontes primárias; o behavior deve ser revalidado se o runner/versões de actions ou as políticas GitHub mudarem durante a implementação.

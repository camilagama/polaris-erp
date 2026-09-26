# Pesquisa do ponto 44 — backup e recuperação

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. RPO máximo de 1 hora e RTO máximo de 8 horas para perda total do Neon; frequência, retenção, custo e proteção independente dos objetos R2 serão definidos e provados na implementação conforme sizing e drills.  
**Pergunta:** estabelecer uma estratégia recuperável para o ERP com Neon sem confundir PITR/snapshots do mesmo provedor com uma cópia independente, e sem aprovar custos com base em volume/plano ainda desconhecidos.

## Recomendação

O relatório está correto em elevar backup/restore a gate anterior à produção. Para dados transacionais de um ERP, recomendo que uma cópia lógica criptografada fora do Neon deixe de ser uma camada “opcional conforme valor dos dados”: ela deve ser parte da estratégia antes de gravar dados reais de clientes. A frequência, a retenção e o plano Neon devem ser escolhidos depois de o negócio declarar o máximo aceitável de perda de operações e de indisponibilidade, e depois de medir tamanho, churn e tráfego.

Usar camadas com finalidades distintas:

1. **Neon instant restore/PITR** para recuperar rapidamente de erro de usuário, escrita ou migration dentro da janela ainda retida pelo Neon.
2. **Snapshot Neon** como ponto marcado antes de uma operação arriscada ou, se o plano e custo justificarem, snapshot agendado para retenção além da janela PITR. Snapshot ainda reside no Neon e não é cópia independente do projeto/provedor.
3. **`pg_dump` periódico, criptografado antes do upload, em bucket R2 privado dedicado** para portabilidade e recuperação se o histórico/snapshot Neon não estiver acessível. Um dump não dá PITR: o RPO do caminho externo fica limitado ao último dump completo e verificado.
4. **Restore drill real em alvo descartável** para validar cada caminho separadamente, medir RPO/RTO observado e exercitar acesso, chave, cliente PostgreSQL, restore e validação da aplicação. Um job verde de backup, checksum ou checklist não prova que o banco restaurado funciona.

Não escolher ainda 6 horas, 30 dias, classes ou retenção do Hub. Valores técnicos devem decorrer do objetivo de negócio e de uma projeção que use plano, volume, WAL/write churn, tamanho comprimido, frequência, retenção e tráfego reais. O Hub é evidência de que essa arquitetura pode ser automatizada, não um sizing para Polaris.

## Evidência local e escopo

- A estratégia versionada de ambientes já pressupõe branches Neon separadas para produção, E2E e desenvolvimento (`docs/architecture/database-environments.md`). O usuário confirmou que Polaris ainda não está publicado na Vercel; portanto não há ambiente de produção implantado para certificar e os jobs reais dependem da escolha/configuração de hospedagem e credenciais.
- O repositório não tem automação versionada que faça backup ou restore de produção. `scripts/check-restore-drill.ts` valida quatro campos de evidência declarados por variáveis; `.github/workflows/ci.yml` tem um job manual `restore-drill-checklist` que executa esse validador. Eles registram intenção/evidência declarada, não conectam ao Neon, não geram backup nem executam `pg_restore`. A própria `docs/operations/environments-and-deployment.md` declara esse limite.
- O produto já possui bytes duráveis fora do banco: `docs/architecture/product-images-r2.md` descreve variantes finais `detail.webp` e `table.webp` em `product-images-final`, sem expiração automática, e objetos temporários de upload em `product-images-staging`, recomendados para expirar após um dia. `pg_dump` e Neon PITR protegem referências/metadata no PostgreSQL, mas **não restauram os bytes das imagens finais**. A recuperação das imagens finais precisa entrar no inventário e receber seu próprio procedimento/retention. Os uploads temporários só precisam de recuperação se a regra de negócio disser que ainda são fonte necessária; hoje são temporários por desenho.
- Um restore de DB para um timestamp anterior pode apontar para uma versão de imagem que já foi substituída/removida no bucket, e restaurar imagens sem os metadados correspondentes também pode criar órfãos. O drill deve testar as duas fontes de estado ou explicitar que, no primeiro lançamento, as imagens são reconstruíveis/recarregáveis. Não presumir que a reconciliação de órfãos recupera bytes apagados.

### Comparação com o Hub

O Hub registra no seu runbook `docs/operations/production-backup-restore.md` backup automatizado `pg_dump` para bucket R2 dedicado, cifra client-side, credenciais separadas de backup/restore/admin, regras R2 de lock/lifecycle, restore a banco descartável, ensaio PITR e tempos medidos. É referência valiosa de controles, manifestos, separação de credenciais e evidência.

Não copiar ao Polaris a agenda de seis horas, as classes `frequent/daily/weekly`, a margem interna de uso do Free, o nome/configuração de buckets, a idade máxima, as medidas de RPO/RTO, as versões de ferramentas ou os workflows: são decisões específicas à operação e ao estado do Hub. O snapshot no runbook tem data/execuções próprias; use-o como registro histórico do projeto Hub, não como confirmação das contas/planos do Polaris.

## Comparação dos mecanismos

| Mecanismo | Recupera bem | Independência e limites | Efeito sobre RPO/RTO |
| --- | --- | --- | --- |
| Neon PITR / instant restore | Estado de branch a timestamp dentro do histórico retido; bom para erro recente e para derivar branch de inspeção | Somente root branch; mesma conta/projeto/infra Neon. Janela e quota variam por plano. Não cobre arquivos R2 nem configuração/app | RPO potencialmente fino dentro da janela; RTO do banco pode ser curto, mas aplicação pronta precisa ser medida. Não cobre incidente ocorrido antes da janela ou indisponibilidade do projeto/provedor |
| Neon snapshot | Estado marcado que pode ser restaurado para uma nova branch; útil para checkpoint de migration e retenção fora do PITR | Continua dentro do Neon; snapshot agendado não está disponível no Free. Limite/custo e esquema de retenção são diferentes de PITR | RPO é a idade do snapshot escolhido; snapshot pode permitir recuperação além do history window. Restore fácil/rápido segundo Neon, mas validar duração até aplicação pronta |
| `pg_dump` → R2 | Cópia lógica completa de um database, portável para um PostgreSQL compatível e para outro serviço/conta | Outro serviço e formato portável, porém não outra identidade se a mesma conta Cloudflare/admin controlar tudo. Não faz PITR, não inclui objetos R2, configuração Vercel nem globals do cluster | RPO no máximo a idade do dump completo mais atraso/falhas do agendamento; RTO depende de bytes, instância alvo, download/decifra e `pg_restore`; medir com volume real |
| Restore drill | Prova o caminho, as permissões, a chave e o conteúdo restaurável | Não é outro mecanismo de cópia e não reduz o RPO por si só. Testar em target isolado descartável; não restaurar sobre produção | Mede latência operacional e pode revelar RPO/RTO reais. Exigir validações sem PII, além do exit code de `pg_restore` |

Neon descreve snapshots como estado point-in-time de uma branch, com restore para nova branch; a documentação de produto distingue essa retenção de PITR e da história WAL. O restore deve começar com branch/alvo de inspeção quando possível, para validar dados antes de finalizar/swap. O `pg_dump` custom combinado com `pg_restore` é consistente mesmo com leituras/escritas concorrentes e permite inspeção/restauração seletiva, mas representa o estado no instante em que começou, não uma sequência incremental de commits.

## Neon: Free versus planos pagos

Os valores foram lidos na documentação oficial atual em 2026-09-25; revalidar no momento de provisionar, pois planos e preços podem mudar.

| Recurso relevante | Free | Launch | Scale |
| --- | --- | --- | --- |
| Instant restore / history window máximo | 6 horas, limitado a 1 GB de histórico; sem cobrança específica | Até 7 dias; histórico cobrado a $0.20/GB-mês | Até 30 dias; histórico cobrado a $0.20/GB-mês |
| Snapshots manuais | 1 | 100 | 100 |
| Snapshots agendados | indisponíveis | disponíveis; snapshots de schedule não contam no limite manual | disponíveis; snapshots de schedule não contam no limite manual |
| Snapshot storage | snapshot manual cobrado como full; valor de armazenamento documentado como $0.09/GB-mês | $0.09/GB-mês; primeiro em schedule full e seguintes incrementais/delta | mesma estrutura descrita |
| Storage lógico do projeto | 0.5 GB/projeto | medido a $0.35/GB-mês | medido a $0.35/GB-mês |
| Transferência pública de dados | 5 GB/projeto/mês | 500 GB/projeto/mês incluídos; depois $0.10/GB | 500 GB/projeto/mês incluídos; depois $0.10/GB |

Implicações:

- **Free pode bastar para desenvolvimento/preprodução sintéticos**, se o limite de 0.5 GB/5 GB e a janela de 6 horas forem aceitáveis para os testes. A única snapshot manual é um checkpoint, não retenção agendada.
- **Não tratar Free como proteção completa para o ERP em produção.** Antes de escolher, comparar a perda de dados que o negócio aceita com janela de apenas 6 horas; incluir o teto de histórico e os limites de armazenamento/transferência. Uma cópia externa melhora independência e portabilidade, mas não amplia o PITR Neon e Full `pg_dump` periódico pode consumir os 5 GB/mês de transferência Free.
- **Launch é o primeiro candidato para production se 7 dias, snapshots agendados, branch protection e alertas de gasto cobrirem os objetivos**; isso não determina custo mensal total. O custo de PITR varia com volume de WAL/write churn e history window, e snapshot depende do volume/storage e cronologia das alterações.
- **Scale não deve ser escolhido por backup sozinho**: seus 30 dias de PITR e capacidades adicionais só justificam custo se a janela de recuperação ou outros requisitos do ERP exigirem isso. O plano não está confirmado; não fixar nenhum custo agregado antes de medir.
- O tráfego de `pg_dump` externo sai do Neon e conta como transferência pública por projeto, compartilhada com outros produtos/serviços Neon. A frequência pode ser limitada por RPO e pelo tamanho do dump, não apenas pelo preço do bucket.

PITR guarda WAL/histórico recente: é o melhor recurso para volta fina, não uma cópia em outra autoridade administrativa. Snapshot fixa uma imagem de estado, dá checkpoint mais duradouro e continua dentro do serviço. A documentação Neon atual informa cobrança/limites diferentes para os dois e diz que só root branches podem fazer PITR.

## R2: independência, limites, retenção e credenciais

Como R2 já foi selecionado para objetos do produto, um bucket R2 de backup mantém o dump fora do Neon sem introduzir um novo fornecedor no stack. Usar bucket **dedicado e privado**, sem misturar mídia do produto com archives. Esse recorte oferece falha de serviço/provedor diferente do Neon, mas não elimina falha de conta/admin Cloudflare compartilhada; se o modelo de ameaça incluir comprometimento da conta inteira, uma conta/identidade administrativa separada aumenta a independência, ao custo de mais operação.

Valores atuais de Cloudflare R2 Standard: 10 GB-mês, 1 milhão de operações Class A e 10 milhões Class B por mês no free tier; acima, $0.015/GB-mês, $4.50 por milhão A e $0.36 por milhão B. Egress direto não tem tarifa. O free tier não se aplica a Infrequent Access; essa classe custa $0.01/GB-mês e $0.01/GB de retrieval, com duração mínima cobrável de 30 dias. Para cópia de recuperação de pequeno porte, Standard simplifica acesso e usa a franquia gratuita; escolher IA só após calcular ciclo completo de escrita, retenção e restore.

Limite de custo não é inferível hoje: storage depende do dump comprimido/cifrado e da retenção simultânea; operações dependem da quantidade de chaves/manifestos/verificações; egress é cobrado no lado de origem (Neon, acima da franquia do plano), mesmo que R2 não cobre saída. Não multiplicar “bytes atuais × dias” sem estimar crescimento, WAL e backup completo ao longo de um mês.

Controles recomendados:

- criptografar o dump no runner **antes** de fazer upload; guardar apenas recipient/chave pública no job e manter chave privada de restore em custódia separada, fora do repo, CI output e bucket; perda da chave privada torna o archive irrecuperável;
- chaves S3 separadas, limitadas ao bucket de backups: Object Read & Write apenas no job que publica; Object Read only no caminho de restore; não reutilizar as credenciais do app nem dar bucket-admin ao workflow;
- configuração de lock/lifecycle feita com identidade administrativa separada, não com as credenciais de job. R2 Bucket Lock impede delete/overwrite até a duração ou indefinidamente e prevalece sobre lifecycle, porém regra de lock pode ser removida no dashboard/Wrangler/API por quem tem permissão de editar configuração; logo é proteção contra identidade de dados comum, não garantia contra comprometimento do administrador da conta;
- chaves/nomes de archive imutáveis por execução, hashes/tamanho no manifesto sanitizado, teste de leitura e restore; regra de lifecycle e lock alinhadas para retenção. Começar com retenção limitada e validada, sem retenção infinita automática de dado pessoal/financeiro;
- não expor bucket (sem `r2.dev`, custom domain, política pública); R2 já fornece criptografia em repouso e TLS em trânsito, mas isso não substitui cifra gerenciada pelo Polaris antes de enviar o dump para reduzir exposição a contas/credenciais do storage.

## Escopo do restore e validação

O artefato `pg_dump` deve ser pensado como cópia do **database**, não da implantação inteira. Documentar separadamente: migration/schema version que identifica o estado restaurado; PostgreSQL client/server compatível; roles/grants e extensões que precisam ser recriadas por migrations/provisionamento; variáveis/secrets do app; domínio/callbacks; imagens/arquivos duráveis em R2; e workers/integrações. Evitar incluir segredos ou URLs no dump manifest, logs, summaries ou relatório.

O primeiro restore drill usa banco/branch descartável sem endpoint público, confirma alvo vazio e bloqueia nomes/IDs de produção antes de executar comandos. Para o dump externo, exercitar busca do objeto, leitura, verificação de hash/tamanho, decifra, inspeção do archive e `pg_restore` até o final. Depois validar versão de migration, tabelas/constraints/índices críticos, queries de invariantes e readiness/smoke apropriado. Armazenar somente evidência sanitizada: backup ID, classe/data UTC, migration, idade, SHA/deployment quando aplicável, status, duração/RPO/RTO e resultado dos checks; não nome/PII de cliente, conexão, key ou dump.

RPO é o máximo de tempo de dados cuja perda é tolerada; RTO é o máximo de indisponibilidade tolerada. São metas do negócio, e a escolha de estratégia vem depois. Medir cada mecanismo separadamente:

- PITR: ponto recuperado escolhido versus instante definido de incidente de teste; cronometre desde a declaração do incidente até o banco e aplicação ficarem disponíveis;
- snapshot: idade real do snapshot selecionado e tempo para branch recuperada + validação;
- dump externo: idade do último backup verificado no momento do cenário de perda, incluindo atraso/falha de agendamento; tempo do início da recuperação até readiness, incluindo criação de target e configuração do app.

Agendar a repetição depois de medir o custo/tempo e avaliar o risco; repetir antes de produção e quando mudarem versão PostgreSQL/cliente, ferramenta/formato, processo de cifra, permissões, chaves, destino, lifecycle/lock, janela/plano, migrations de alto impacto ou recuperação de objetos. O registro acordado em P43 deve distinguir “configurado”, “backup recente verificado” e “restore testado”, com escopo, data, responsável, próximo gap e gatilho de revalidação. Check de freshness pode bloquear release quando a evidência ultrapassar objetivo aprovado, mas o limite ainda precisa de resposta de negócio.

## Evidência comunitária (secundária, anedótica)

Em [discussão recente de r/devops sobre testar restaurações de banco](https://www.reddit.com/r/devops/comments/1v0m5nh/does_anyone_actually_test_their_database_restores/), participantes relatam desde `pg_restore` em container descartável com inspeção de tabelas até restores agendados para instância PostgreSQL efêmera, com validação de contagens, timestamp recente e queries do app antes de destruir o alvo. Os relatos ilustram que é possível medir/certificar um caminho sem manter cópia de staging permanente e que backup job success não basta; são experiências individuais e não uma frequência ou arquitetura normativa.

## Fontes primárias atuais

- Neon, [Plans](https://neon.com/docs/introduction/plans): limites de Free/Launch/Scale, history window de instant restore, snapshots e valores de storage/transferência.
- Neon, [Three Ways to Use Your Snapshots](https://neon.com/blog/three-ways-to-use-your-snapshots): snapshot como estado point-in-time read-only, restore em nova branch, diferença para PITR e agendamento pago.
- Neon, [API — Restore snapshot](https://api-docs.neon.tech/reference/restoresnapshot): restore não finalizado para inspeção, nova branch e opção de finalize/swap.
- PostgreSQL, [Backup and Restore](https://www.postgresql.org/docs/current/backup.html) e [`pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html): consistência sob uso concorrente, formatos de arquivo, limite de escopo de database e restore via `pg_restore`.
- Cloudflare, [R2 Pricing](https://developers.cloudflare.com/r2/pricing/): Standard/IA, free tiers, operações, egress e custos de retrieval/duração mínima.
- Cloudflare, [R2 Bucket Locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) e [Object Lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/): regra por prefixo, precedência entre lock/lifecycle, limite e configuração/remoção de regra.
- Cloudflare, [R2 tokens and permissions](https://developers.cloudflare.com/r2/api/tokens/): Object Read & Write/Read only e escopo por bucket.
- Cloudflare, [R2 data security](https://developers.cloudflare.com/r2/reference/data-security/): encryption-at-rest AES-256 com keys geridas pelo provedor e TLS em trânsito.
- AWS Well-Architected, [Define recovery objectives](https://docs.aws.amazon.com/wellarchitected/2024-06-27/framework/rel_planning_for_recovery_objective_defined_recovery.html) e [Perform periodic recovery](https://docs.aws.amazon.com/wellarchitected/2023-04-10/framework/rel_backing_up_data_periodic_recovery_testing_data.html): RTO/RPO como metas de workload e recuperação periódica para provar integridade, disponibilidade e tempo.

## Próxima decisão a grillar

1. Confirmar o limite de perda de transações e indisponibilidade aceitável do ERP antes de fixar janela PITR, cadência e RTO; não copiar os valores do Hub.
2. Para produção, aceitar camada externa `pg_dump` criptografada em R2 dedicado como requisito, além da recuperação Neon, ou declarar explicitamente um motivo de negócio para não mantê-la.
3. Incluir imagens finais duráveis do R2 no escopo de recuperação; decidir se terão réplica/cópia independente e qual será o restore drill, mantendo uploads temporários fora do objetivo se continuarem descartáveis.
4. Escolher o plano Neon após validar objetivos e projetar volume/tráfego; não presumir Free nem selecionar Scale por padrão.

**Execução:** pesquisa documental e leitura local; sem acesso a recursos Neon/R2, sem mudança no plano principal/código, sem testes e sem execução de backup ou restore.

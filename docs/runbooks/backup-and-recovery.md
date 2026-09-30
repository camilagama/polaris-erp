# Backup e recuperação

Este runbook registra o procedimento aprovado em P44 e os critérios que o backup e o restore deverão satisfazer. Ele descreve o alvo de implementação; sua presença **não** comprova configuração, execução ou recuperação. O estado atual e as evidências ficam no [registro P43](../operations/production-readiness.md).

## Objetivos e limite de recuperação

Para perda total do **projeto Neon**, os objetivos aprovados são RPO máximo de 1 hora e RTO máximo de 8 horas até o banco e a aplicação estarem operacionais. RPO e RTO só passam quando medidos em um exercício realista de recuperação, não quando apenas a agenda, o preflight ou o checker passam.

Esse cenário não comprova recuperação da indisponibilidade total do serviço Neon, da perda da conta Neon ou da conta Cloudflare. Se algum desses cenários fizer parte do risco que o negócio precisa cobrir, será necessário um alvo independente e a estratégia precisará ser ampliada antes do go-live.

## Camadas de recuperação

- **Histórico e recuperação nativa do Neon:** recuperar mudanças recentes usando apenas os recursos de PITR/restore disponíveis para o plano e a branch selecionados. Restaurar para branch/alvo isolado para inspeção; snapshots manuais ou agendados podem servir como checkpoints quando o plano e o custo justificarem. Histórico, PITR e snapshots permanecem no serviço Neon e não substituem uma cópia externa. Revalidar janela, elegibilidade de branch e recursos habilitados na [documentação de planos](https://neon.com/docs/introduction/plans) quando provisionar.
- **Cópia lógica externa:** `pg_dump` produz um snapshot consistente de um banco no início da execução e pode ser restaurado com `pg_restore`. Ele é portátil, mas não é arquivamento contínuo de WAL, não recupera um instante arbitrário e não inclui objetos globais do cluster, roles, tablespaces nem arquivos R2. Usá-lo como cópia independente somente se o volume, a frequência, a transferência e o tempo de restore medidos atenderem aos objetivos; avaliar a orientação do [PostgreSQL 18 sobre métodos de backup](https://www.postgresql.org/docs/18/backup.html), [`pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html) e [`pg_restore`](https://www.postgresql.org/docs/18/app-pgrestore.html).
- **Imagens finais:** bytes duráveis em `product-images-final` estão fora do PostgreSQL. Incluir sua cópia/retention ou uma reconstrução e reenvio que tenha sido validados. O ponto de recuperação dos objetos precisa ser compatível com o estado de imagem e `image_version` no banco.
- **Uploads de staging:** podem ficar fora do objetivo enquanto forem temporários e descartáveis por regra de produto; reabrir se passarem a ser fonte de dados necessária.
- **Configuração da aplicação:** domínios, callbacks, roles, grants, secrets e configuração de workers não estão no dump. O procedimento precisa indicar como provisioná-los por fontes controladas, sem colocá-los no archive ou no manifesto.

## Decisões necessárias antes de provisionar

Não fixar plano, frequência, retenção, ferramenta de cifra, runner ou custo com dados de outro projeto. Registrar e medir:

1. Plano Neon, janela PITR, elegibilidade de snapshots agendados e limite de armazenamento/histórico.
2. Tamanho lógico do banco, crescimento, churn/WAL, tamanho do dump cifrado, duração de `pg_dump`, egress mensal e duração de `pg_restore`.
3. Executor e agenda capazes de manter a idade do último backup completo e legível dentro do RPO de 1 hora, incluindo atraso, retry e falha. Frequência nominal de uma hora, isoladamente, não prova o RPO.
4. Retenção e custo de Neon e R2, com lifecycle e lock alinhados para cada cópia mantida.
5. Papel exclusivo de backup, sem escrita/DDL, cujo acesso completo às tabelas e linhas protegidas por RLS seja comprovado. Não presumir que um grant amplo lê linhas ocultas por RLS; o runtime continua sem `BYPASSRLS`.
6. Cifra client-side antes do upload, algoritmo/formato e custódia da chave privada fora do repositório, CI e bucket. Perder a chave privada torna o archive irrecuperável.
7. Falha de conta incluída no threat model. Um bucket R2 dedicado e privado separa a cópia dos dados de Neon, mas um bucket na mesma conta Cloudflare não prova recuperação da perda ou comprometimento dessa conta.

R2 deve ser dedicado e privado, sem domínio público, `r2.dev` ou CORS. Separar identidade de escrita do backup, identidade somente leitura para restore e identidade administrativa para lock/lifecycle. As permissões de objeto e o efeito real das regras devem ser conferidos na documentação atual de [tokens R2](https://developers.cloudflare.com/r2/api/tokens/), [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) e [lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/). A permissão de escrita por objeto também permite ler/listar; não a tratar como write-only. A identidade administrativa não deve ser usada pelo job de backup.

## Contrato da execução de backup

O job automatizado ainda não existe. Quando implementado:

1. Confirmar, sem imprimir URL ou credenciais, projeto/branch/banco de origem, major PostgreSQL e identidade do papel de backup. Usar conexão Neon direta, nunca o host `-pooler` para `pg_dump`/`pg_restore`.
2. Gerar um archive completo do banco e verificar código de saída, warnings, conteúdo/listagem, tamanho e SHA-256. Selecionar o formato e compatibilidade do cliente após um POC de dump e restore.
3. Comprovar a cobertura de todas as tabelas/tenants protegidos por RLS e manter roles, grants, extensões e objetos globais necessários em procedimento de provisionamento separado. `pg_dump` não os inclui automaticamente.
4. Cifrar antes de qualquer upload. Remover o dump em claro do diretório temporário ao final, inclusive após falha; não enviar dump, ciphertext, chave privada ou manifesto completo a artifacts, logs ou summaries.
5. Publicar com uma chave de objeto única em bucket privado dedicado. Fazer read-back e conferir tamanho/hash após upload; publicar um manifesto sanitizado somente depois da validação do objeto.
6. Registrar no P43 o alvo, horário UTC, backup ID, migration, major/ferramentas, bytes/hash sanitizados, resultado, idade e próxima ação. Uma falha deixa a cópia anterior como candidata; se sua idade ultrapassar 1 hora, o RPO está violado e o gate deve bloquear uso de dados reais.

O último backup que satisfaz o RPO é o mais recente archive completo, legível e íntegro cuja cadeia de restauração é aceita. O checker de workflow não substitui essas verificações. Um exercício periódico de restore mede a cadeia de chaves, ferramentas, roles e validação da aplicação.

## Restore drill de cópia externa

Executar em branch/banco PostgreSQL descartável, vazio e sem endpoint público. Nunca restaurar sobre Production.

1. Declarar o cenário e o instante do incidente simulado; selecionar o backup que seria usado e confirmar que a origem está no escopo aprovado.
2. Usar credencial R2 somente leitura. Verificar tamanho e hash do objeto cifrado; decifrar em área temporária protegida, sem expor conteúdo ou chave nos argumentos/logs; conferir hash do archive e listar seu conteúdo.
3. Restaurar o banco no alvo descartável com versão de servidor/ferramentas compatível. Recriar roles, grants, extensões e demais objetos globais pelo procedimento aprovado; verificar journal de migrations e versão do schema restaurado.
4. Rodar invariantes sanitizados de schema, constraints, índices críticos, RLS e isolamento entre organizações. A role de runtime testada continua sem `BYPASSRLS`.
5. Restaurar ou reconstruir as imagens finais conforme a estratégia escolhida. Confirmar consistência entre objetos, referências e `image_version`; restaurar banco sem bytes de imagem não fecha o exercício.
6. Iniciar a aplicação com configuração não produtiva e integrações sandbox/fake. Validar readiness e fluxos essenciais sem emails, cobranças ou webhooks para clientes.
7. Medir RPO entre o instante do incidente simulado e o estado recuperado; medir RTO do início do exercício até banco **e aplicação** operacionais. Comparar os valores observados com 1 hora e 8 horas.
8. Apagar o alvo descartável exato e revogar acessos temporários; registrar resultado sanitizado no P43.

## Drill de PITR

Validar essa camada separadamente do archive externo: selecionar um instante dentro da janela Neon efetivamente configurada, criar/restaurar para uma branch descartável, conferir o estado de banco e a aplicação com dados sintéticos, verificar compatibilidade das imagens e remover a branch depois do registro da evidência. Um drill PITR não comprova a cópia R2; um restore R2 não comprova a janela PITR.

## Critério para liberar dados reais

P44 só passa quando houver configuração observada do plano/janela Neon e do bucket, backup externo automatizado com alertas de falha/atraso, credenciais e chaves segregadas, cópia testada e drill real em alvo descartável. O RPO medido deve ser no máximo 1 hora e o RTO observado no máximo 8 horas até a aplicação estar operacional; recuperação das imagens finais também precisa estar demonstrada. Se qualquer alvo não cumprir esses limites, revisar plano, frequência, capacidade, custo ou estratégia antes de go-live. Atualizar P43 com as evidências; o pass do `restore-drill-checklist` sozinho não libera o gate.

## Estado de implementação

O [registro P43](../operations/production-readiness.md) continua sendo a autoridade de configuração e evidência atual. No momento desta revisão, não há backup `pg_dump` ou restore automatizados versionados em Polaris. `ops:restore-drill:checklist` e `ops:production-certification:checklist` validam campos declarados; não conectam ao Neon/R2, não geram archive, não o cifram e não executam restore.

# Pesquisa do ponto 6 — nomes e lifecycle dos buckets R2

**Revisado em:** 2026-09-24  
**Escopo:** divergência de nomes R2 no Polaris; separar rename de variável, bucket físico e object key/prefix; propor nomes para uploads brutos e imagens processadas.

## Veredito

O ponto procede como problema de consistência documental, mas não há evidência no repositório de que os buckets descritos já existam ou contenham dados. O Polaris ainda não foi conectado à Vercel, segundo o usuário; isso reduz o custo de mudar configuração de deploy, mas não prova que não haja recursos/segredos R2 provisionados fora do repositório.

**Recomendação:** decidir agora nomes semânticos para as variáveis de ambiente e para futuros buckets, confirmar o inventário Cloudflare antes de qualquer migração física e não fazer rename de object keys sem necessidade funcional. Manter dois papéis distintos por ambiente: bucket privado de uploads brutos com expiração curta e bucket privado de imagens processadas sem expiração automática.

## Estado comprovado no checkout

- [`docs/architecture/product-images-r2.md`](../docs/architecture/product-images-r2.md) e o código usam `R2_BUCKET_STAGING` para uploads temporários e `R2_BUCKET_FINAL` para variantes processadas. O `.env.example` também usa esses nomes. O adjetivo `final` descreve o estágio do pipeline, mas não a finalidade do bucket tão claramente quanto `processed`.
- [`aidd_docs/production-closed-test.md`](../aidd_docs/production-closed-test.md) ainda cita `R2_BUCKET_PUBLIC` e nomes `polaris-product-images-staging` / `polaris-product-images-public`. Isso diverge do código atual; `public` também é enganoso porque a documentação de arquitetura diz que os buckets ficam privados e a entrega passa por rota autenticada do app.
- O código gera chaves de upload como `staging/{organizationId}/{userId}/{uuid}` e chaves processadas como `organizations/{organizationId}/products/{productId}/v{version}/{variant}.webp`. O reconciliador lista o prefixo `organizations/`. Os objetos processados são derivados por função; as URLs servidas pela aplicação não expõem diretamente as chaves R2.
- A nota atual recomenda CORS e expiração apenas no bucket de upload; o bucket processado não deve ter expiração automática. Essa separação corresponde aos diferentes ciclos de vida e fluxos de acesso.
- O checkout não permite concluir se algum bucket ou token Cloudflare foi criado fora dele. Nenhum valor de `.env.local` foi consultado.

## Três coisas diferentes que podem ser “renomeadas”

| Alvo | O que muda | Custo e risco | Orientação |
| --- | --- | --- | --- |
| **Variável de ambiente** | Nome usado pela aplicação, por exemplo `R2_BUCKET_STAGING` → `R2_BUCKET_RAW_UPLOADS` e `R2_BUCKET_FINAL` → `R2_BUCKET_PROCESSED_IMAGES`. O valor pode continuar apontando ao mesmo bucket. | Baixo enquanto o deploy não está provisionado; envolve schema de env, código, testes, documentação e valores configurados em cada ambiente. Se já houver deploy, a troca precisa ser coordenada para não faltar variável. | É a correção recomendada para deixar a intenção clara. Consultar inventário de deploy antes e, se houver configuração ativa, usar transição compatível ou atualizar código e env no mesmo release. |
| **Bucket R2 físico** | O identificador do recurso Cloudflare muda. A variável pode manter o mesmo nome, mas seu valor passa a apontar ao novo bucket. | Mais alto: criar o novo bucket, copiar dados se existirem, reaplicar CORS/lifecycle/configuração e credenciais, trocar configuração, verificar leitura/escrita e esvaziar o bucket antigo antes de excluí-lo. Uma cópia parcial ou troca prematura pode deixar objetos indisponíveis. | Não encontrei operação documentada de rename de bucket. A API de gestão documenta listar/criar/obter/patch/excluir, sem rename. Tratar uma troca como novo recurso + migração, não como edição de string. Se ainda não existir bucket, criar logo com nome definitivo evita migração. |
| **Object key/prefix** | A chave de um objeto muda, por exemplo `staging/` → `uploads/`, ou `organizations/` → `products/`. Buckets R2 são planos; `/` apenas agrupa visualmente objetos por prefixo. | Esforço varia com a quantidade de objetos. É necessário copiar para cada chave nova e só depois excluir a antiga; atualizar produtores, leitores, listagens/reconciliação e referências persistidas, quando houver. Uma migração em lotes pode deixar dois padrões coexistindo temporariamente. | Não fazer por estética. O atual `staging/` identifica o estado bruto do fluxo e é usado para lifecycle; pode ser mantido, ou trocado para `uploads/` antes de provisionar os buckets se evitar ambiguidade compensar a mudança de código. Não prefixar também os objetos processados com `processed/`: o bucket dedicado já expressa esse papel. |

Cloudflare documenta `CopyObject` na API S3 compatível; portanto, uma mudança de key é uma cópia e uma remoção explícitas, não um rename atômico. A consistência forte documentada torna o objeto copiado legível após a conclusão, mas não torna o conjunto de objetos migrado uma transação única. Buckets só podem ser excluídos vazios. [API S3 compatível e operações](https://developers.cloudflare.com/r2/api/s3/api/), [consistência do R2](https://developers.cloudflare.com/r2/reference/consistency/), [exclusão de buckets](https://developers.cloudflare.com/r2/buckets/delete-buckets/)

## Convenção proposta

Usar nomes minúsculos, com hífens, contendo produto, papel e ambiente. Exemplos para recursos provisionados:

- `polaris-product-images-raw-staging`
- `polaris-product-images-processed-staging`
- `polaris-product-images-raw-prod`
- `polaris-product-images-processed-prod`

Todos respeitam as regras publicadas pelo Cloudflare: 3–63 caracteres, apenas letras minúsculas, números e hífens; sem hífen inicial/final. O sufixo de ambiente deixa evidente a separação e reduz o risco de Preview/Staging atingir dados de Produção. O exemplo comunitário encontrado também usa a forma `project-service-env`, mas é sinal anedótico, não requisito técnico. [Cloudflare: criar buckets](https://developers.cloudflare.com/r2/buckets/create-buckets/), [discussão comunitária de nomenclatura](https://www.reddit.com/r/CloudFlare/comments/1q8ftc9/best_practices_for_organizing_separate_projects/)

Sugestão para nomes das variáveis no código, independentes dos nomes físicos:

```text
R2_BUCKET_RAW_UPLOADS
R2_BUCKET_PROCESSED_IMAGES
```

Local e CI não devem receber nomes de buckets de Produção. Podem usar fakes/local storage para os fluxos comuns; só provisionar buckets não produtivos dedicados se houver uma verificação de integração que precise realmente do R2. Staging e Produção devem ter valores/credenciais próprios. O plano de Preview por PR pode decidir depois se usa um bucket Preview isolado e prefixo por PR ou se não testa uploads reais nesse ambiente.

## CORS e lifecycle

### Uploads brutos

- Manter o bucket privado. O navegador usa URL pré-assinada `PUT`, portanto o bucket de upload precisa de CORS; a URL pré-assinada autoriza uma operação temporária, e CORS permite ao navegador completar a chamada cross-origin. CORS não substitui autenticação/autorização.
- Restringir `AllowedOrigins` aos origins exatos de Local e Staging/Produção que fazem upload; configurar apenas métodos e headers usados pela URL assinada. A documentação recomenda combinar métodos e headers com a operação (por exemplo `PUT`, `Content-Type`) e expor `ETag` se o JS precisar lê-lo. O checker de saúde do Polaris atualmente também espera `HEAD` na regra, então a implantação deve ou incluir `HEAD` ou alinhar esse checker ao método realmente usado.
- Regra de expiração: `expire-raw-product-image-uploads`, filtrada pelo prefixo vigente (`staging/`, ou `uploads/` se for renomeado), expiração de 1 dia. Regra defensiva de multipart: `abort-incomplete-product-image-uploads`, `DaysAfterInitiation: 1`.
- **Caveat de retenção:** lifecycle não é limpeza imediata. Cloudflare diz que objetos geralmente são removidos dentro de 24 horas após o horário de expiração, e objetos existentes podem demorar após atualização de regras. O R2 já aborta multipart incompleto após sete dias por padrão; uma regra de um dia reduz o tempo de órfãos se o fluxo vier a usar multipart.

### Imagens processadas

- Nome de bucket: `polaris-product-images-processed-{staging|prod}`.
- Sem regra de expiração por idade. Preservar remoção por substituição/remoção do app e reconciliador de objetos órfãos, como descrito na arquitetura atual.
- CORS não é necessário para o fluxo atual se o browser só chama a rota autenticada do Next.js e o servidor acessa R2. Revisar se o app passar a buscar esses objetos diretamente do browser ou por URL pré-assinada.

Cloudflare diz que CORS é exigido para chamadas do browser a URLs pré-assinadas; permite CORS por bucket e documenta origens, métodos, headers, headers expostos e cache de preflight. Lifecycle permite filtrar por prefixo e definir expiração e abort multipart; objetos podem levar até cerca de 24 horas após vencerem para serem removidos. [CORS no R2](https://developers.cloudflare.com/r2/buckets/cors/), [object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

## Sequência recomendada para o plano

1. Aprovar nomes de variáveis e convenção de bucket, sem tocar em Cloudflare.
2. Antes da primeira configuração, confirmar com inventário no dashboard/API se já há buckets ou configuração ativa. Se não houver, provisionar diretamente com os nomes definitivos.
3. Atualizar código, testes, `.env.example` e documentação para `R2_BUCKET_RAW_UPLOADS` / `R2_BUCKET_PROCESSED_IMAGES`; corrigir referências antigas `R2_BUCKET_PUBLIC` e `public` para evitar que runbooks indiquem bucket público.
4. Se o inventário encontrar bucket já usado, decidir separadamente: manter seu nome físico e mudar apenas a variável, ou planejar migração explícita. Não executar delete/rename por inferência documental.
5. Só alterar o prefixo `staging/` para `uploads/` se ainda não houver objetos, ou se o plano de migração incluir copy-then-delete, compatibilidade temporária e verificação da reconciliação.

## Fontes primárias

- [Regras de nomes e criação de buckets](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- [API de gestão do R2](https://developers.cloudflare.com/api/resources/r2/) — endpoints de bucket publicados não incluem rename.
- [Operações de objetos na API R2](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/)
- [Compatibilidade da API S3](https://developers.cloudflare.com/r2/api/s3/api/) e [consistência](https://developers.cloudflare.com/r2/reference/consistency/)
- [Política CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)


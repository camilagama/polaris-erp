# PostgreSQL: semântica temporal e implicações para migrations

**Escopo.** Pesquisa documental, sem alterações de código. Fontes: documentação oficial PostgreSQL, consultada em 2026-07-16. As conclusões abaixo são semântica do banco; o modo como uma ferramenta de migration abre ou agrupa transações precisa ser confirmado na ferramenta usada pelo projeto.

## Contrato de tipos recomendado

- Use `timestamp with time zone` (`timestamptz`) para um **instante**: criação, atualização, expiração, evento recebido etc. PostgreSQL converte a entrada para UTC internamente, não retém a zona originalmente informada e a apresenta na `TimeZone` da sessão. Portanto, alterar `TimeZone` não altera o instante armazenado. [Tipos date/time, §8.5.1.3](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-INPUT-TIMESTAMPS), [zonas, §8.5.3](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-TIMEZONES)
- Use `date` para uma **data civil**, sem hora nem zona: por exemplo, `occurred_on`, dia de competência ou dia selecionado no calendário. `date` tem resolução de um dia e não carrega fuso. [Tabela de tipos date/time](https://www.postgresql.org/docs/current/datatype-datetime.html)
- A passagem de instante para data civil de negócio deve declarar a zona: `(occurred_at AT TIME ZONE 'America/Sao_Paulo')::date`. Para um `timestamptz`, `AT TIME ZONE` entrega `timestamp without time zone` com a hora como ela ocorre na zona especificada; o cast subsequente para `date` descarta somente a hora. [Operador `AT TIME ZONE`, §9.9.4](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT)

Consequência: `date(timestamptz_column)` depende da `TimeZone` da sessão. A documentação estabelece que valores `timestamptz` são apresentados na zona atual e que a conversão entre `timestamptz` e `timestamp` sem zona assume a `TimeZone` quando nenhuma zona é explicitada. Assim, perto da meia-noite, a mesma coluna pode resultar em datas diferentes em sessões UTC e `America/Sao_Paulo`. Esta é uma inferência direta dessas regras, não uma propriedade adicional da função `date`. [Conversão e apresentação de `timestamptz`](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-INPUT-TIMESTAMPS)

## `CURRENT_DATE`, `now()` e defaults

- `CURRENT_DATE` retorna um `date`; `CURRENT_TIMESTAMP` retorna `timestamptz`. As funções SQL de data/hora corrente são fixadas no **início da transação**, não no instante de cada chamada. [Funções e tipos de retorno](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT), [estabilidade durante a transação](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
- `now()` é equivalente histórico de `transaction_timestamp()`, que por sua vez é equivalente a `CURRENT_TIMESTAMP`. É apropriado para um instante e não deve ser substituído por uma data de negócio. [§9.9.5](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
- `CURRENT_DATE` é sensível à zona da sessão, pois a data corrente é a data local derivada do instante da transação. Logo, um `DEFAULT CURRENT_DATE` não codifica `America/Sao_Paulo`; ele produz o dia da `TimeZone` da conexão que inseriu a linha. Essa dependência também decorre das regras oficiais de apresentação/conversão de `timestamptz` na zona da sessão. [Tipos e `TimeZone`](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-TIMEZONES)
- Para uma coluna `date` cujo contrato é BRT, o default autoexplicativo é `DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date)`. `now()` produz o mesmo instante de início de transação, portanto `DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date)` é semanticamente equivalente. Use uma dessas formas de modo uniforme.
- Não use `TIMESTAMP 'now'` em um default: a documentação alerta que esse literal é avaliado ao analisar/criar o objeto, ficando obsoleto. `CURRENT_TIMESTAMP` e `now()` são avaliados quando o default é aplicado na inserção. [Cuidado para cláusulas `DEFAULT`](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)

O congelamento no começo da transação também importa para testes e jobs longos: uma transação que atravesse a meia-noite continuará vendo o mesmo `CURRENT_DATE` e `now()`. Isso é comportamento esperado, não uma corrida de relógio.

## `AT TIME ZONE`: direção importa

| Expressão | Resultado | Significado |
| --- | --- | --- |
| `timestamp_without_tz AT TIME ZONE 'America/Sao_Paulo'` | `timestamptz` | Interpreta a hora civil como ocorrida em São Paulo e produz o instante. |
| `timestamptz_value AT TIME ZONE 'America/Sao_Paulo'` | `timestamp without time zone` | Mostra o instante como hora civil de São Paulo. |

As duas direções são definidas oficialmente e não são intercambiáveis. O primeiro caso é para interpretar uma hora civil; o segundo, para derivar data/hora civil de um instante. [Tabela 9.34](https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT)

Prefira o nome IANA completo `America/Sao_Paulo`, não uma abreviação. A documentação diferencia nomes completos, que podem carregar regras históricas/de horário de verão, de abreviações, que denotam offsets e podem ser ambíguas. [§8.5.3](https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-TIMEZONES)

## Escopo de `SET TIME ZONE`, `SET LOCAL` e `set_config`

- `SET TIME ZONE 'America/Sao_Paulo'` é um `SET` da **sessão atual**. Se efetuado e a transação for confirmada, permanece até a sessão acabar ou outro `SET` alterá-lo. Nunca afeta outras sessões. [Comando `SET`](https://www.postgresql.org/docs/current/sql-set.html)
- `SET LOCAL TIME ZONE 'America/Sao_Paulo'` termina no `COMMIT` ou `ROLLBACK`; fora de um bloco de transação o PostgreSQL emite aviso e não tem efeito. [Escopo de `SET LOCAL`](https://www.postgresql.org/docs/current/sql-set.html)
- `set_config('TimeZone', 'America/Sao_Paulo', true)` é o equivalente funcional local: com `true`, a configuração só vale na transação atual; com `false`, vale no restante da sessão. [Função `set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)
- `SET`, `SET LOCAL` e `set_config` alteram valores locais à sessão, não uma política global do banco. Defaults globais exigem meios como `ALTER DATABASE`, `ALTER ROLE` ou configuração do servidor, os quais passam a ser aplicados no início de sessões novas. [Configuração por SQL](https://www.postgresql.org/docs/current/config-setting.html#CONFIG-SETTING-SQL)

Implicações práticas:

1. `set_config(..., true)` é adequado para delimitar uma transação de aplicação já existente, desde que **todas** as consultas que dependem dele sejam executadas na mesma transação e conexão.
2. `SET TIME ZONE` sem `LOCAL` pode vazar para a próxima operação quando a conexão retorna a um pool. Só é seguro se a infraestrutura garantir reset ou se a configuração for uma política deliberada de toda a sessão.
3. Nenhuma dessas chamadas torna migrations automaticamente consistentes. Uma migration é executada pela conexão e transação escolhidas pela ferramenta, não pelos wrappers de contexto da aplicação.

## Migrations: requisito de determinismo

Uma migration com `date(cancelled_at)`, `CURRENT_DATE`, cast implícito entre `timestamp` e `timestamptz`, ou literal sem zona pode variar conforme a `TimeZone` da sessão do executor. Colocar `set_config(..., true)` no início só protege comandos posteriores se a migration inteira estiver em uma transação explícita, pois esse escopo expira ao fim da transação. Se a ferramenta usar autocommit ou fragmentar a migration, a chamada local não protege a próxima instrução. [Escopo local](https://www.postgresql.org/docs/current/sql-set.html), [`set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)

Para alterações de dados e defaults que representem a data de negócio, a forma robusta é explicitar a zona em cada expressão relevante:

```sql
-- Derivar a data civil BRT a partir de um instante já armazenado.
UPDATE sale_reversal
SET occurred_on = (cancelled_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE cancelled_at IS NOT NULL;

-- Preservar o mesmo contrato para linhas futuras.
ALTER TABLE sale_reversal
  ALTER COLUMN occurred_on
  SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date);
```

Isso evita depender de contexto de aplicação, da zona padrão do banco e de qualquer detalhe transacional do executor de migration. A migration deve ser nova e corretiva quando uma migration já aplicada tiver derivado datas na zona errada; reescrever migration histórica não corrige bancos que já a executaram.

## Decisões para o plano do projeto

1. Tratar `timestamptz`/`Date` como instantes e mantê-los em UTC internamente; `TimeZone` altera representação e conversões, não o instante armazenado.
2. Tratar `YYYY-MM-DD`/`date` como dados civis. Converter para essa forma apenas com `America/Sao_Paulo` explícito nos limites SQL e JavaScript.
3. Não depender da configuração transitória de sessão para defaults ou backfills de migrations. Fixar o fuso na expressão SQL que materializa a data civil.
4. Manter `now()` para timestamps de auditoria (`created_at`, `updated_at`, expirações) e não classificá-lo como defeito de UTC.
5. Testar instantes imediatamente antes/depois da meia-noite de São Paulo, além de validar que defaults e backfills retornam a mesma `date` com sessões configuradas em UTC e em `America/Sao_Paulo`.

## Limites desta pesquisa

Este relatório não infere se uma migration concreta do repositório está errada nem se o executor do projeto envolve cada arquivo em transação. Essas respostas exigem auditoria do SQL e da ferramenta de migration. A semântica acima define precisamente o que essa auditoria deve procurar.

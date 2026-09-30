---
execution_status: completed
---

# PR-007: política de falha do rate limit

> **Implementação concluída no Web/Admin:** políticas e testes estão no código atual. A configuração de providers e quaisquer gates de Production continuam separados em [P43](../../operations/production-readiness.md).

1. Cobrir primeiro a falha do Upstash em produção nos módulos web e admin.
2. Manter o fallback local apenas fora de produção.
3. Verificar os dois pacotes e atualizar o status do relatório somente com os testes aprovados.

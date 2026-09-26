# Pesquisa do ponto 49 — perímetro do Admin

**Data:** 2026-09-25  
**Estado:** decisão aceita em 2026-09-25. Manter perímetro Vercel e autorização interna `platform_admin` como controles independentes; validar ambos para o lançamento.  
**Pergunta:** manter Vercel Authentication no Admin em conjunto com autenticação e autorização internas da aplicação.

## Conclusão provisória

Manter as duas camadas. A recomendação do relatório está correta no princípio, mas deve ser atualizada para refletir uma mudança recente de preço e escopo: desde 2026-09-09, a Vercel permite Vercel Authentication em **All Deployments**, incluindo produção, sem custo adicional em todos os planos. A documentação atual foi atualizada em 2026-09-15.

Quando a Vercel for configurada, aplicar a política por projeto:

- **Admin:** Vercel Authentication com escopo **All Deployments**, cobrindo Preview, URLs geradas e o domínio customizado de produção. O console é interno, então o acesso ao domínio de produção também deve exigir conta Vercel com acesso ao projeto.
- **Web:** proteger Preview e URLs geradas, mas manter o domínio de produção acessível aos clientes. A opção atual **Standard Protection** faz isso. Durante a fundação, antes do lançamento, All Deployments também pode ser usado para manter o Web inteiramente fechado; mudar o escopo quando o produto for aberto.
- Não aplicar um default `All Deployments` sem verificar a exceção por projeto do Web. A separação dos projetos Vercel Web/Admin permite políticas distintas; o escopo é uma configuração por projeto.

Vercel Authentication é uma barreira de perímetro, não autorização do Polaris. A aplicação ainda deve autenticar a sessão Better Auth, exigir grant de `platform_admin` ativo e checar a role mínima em cada página, Server Action e Route Handler. Um usuário que passe pela barreira da Vercel não ganha privilégio no produto; bypass ou exceção da Vercel tampouco pode remover as verificações internas.

## Evidência no Polaris

- A separação Web/Admin já está expressa por `vercel.json` e `apps/admin/vercel.json`; isso descreve a intenção local, não confirma projetos Vercel remotos.
- `docs/architecture/authorization-model.md` separa sessão, grant interno, contexto transacional e RLS. O documento diz que Vercel Authentication não substitui o grant interno.
- `docs/modules/platform-admin.md` confirma que o Admin usa sessão Better Auth mais grant ativo de `platform_admin`; também registra que login real, Vercel Authentication e sessão entre origens ainda não foram validados externamente.
- `docs/architecture/external-integrations.md` classifica a configuração/deploy Vercel e a proteção Vercel Authentication como não confirmados. Nenhum estado de conta ou deployment foi consultado nesta pesquisa.
- Os dois controles têm experiências de login separadas: Vercel exige conta Vercel com acesso ao projeto, e o Polaris exige sua própria sessão. A identidade e o login cross-origin do Better Auth não estão provados; não se deve prometer aos operadores uma experiência de login único.

## Escopo e comportamento documentados pela Vercel

- Vercel Authentication permite somente usuários Vercel com acesso apropriado ao deployment. O visitante é redirecionado para login; sem permissão, pode pedir acesso. Acesso de membros também depende de acesso ao projeto, não apenas de conhecer a URL.
- `All Deployments` protege Preview e produção, inclusive o domínio customizado de produção e URLs geradas como `*.vercel.app`. `Standard Protection` protege deployments exceto domínios de produção. Portanto, é possível proteger o Admin de ponta a ponta e manter público somente o domínio Web que atende clientes.
- Vercel Authentication e o escopo `All Deployments` não exigem add-on pago nos planos atuais. `Password Protection` tem cobrança/disponibilidade diferente e não é necessária para esta recomendação.
- Acesso de colaboradores tem limites que afetam o uso interno: no Hobby, a documentação limita a um usuário externo por conta; Pro e Enterprise permitem convidar um ou mais colaboradores. Para cada operador interno, será necessário conceder acesso Vercel e manter a conta Vercel ativa. O custo/assentos da conta escolhida ainda precisa ser conferido ao configurar o hosting.
- Deployment Protection Exceptions tornam um domínio Preview público e ignoram Vercel Authentication e outras proteções. Shareable Links e bypass de automação também ampliam o acesso a deployments específicos. Não usar esses recursos no Admin como substituto de login da aplicação; qualquer exceção operacional deve ser restrita e registrada.
- A proteção é aplicada a requisições antes da aplicação, incluindo requisições ao Routing Middleware. Isso não muda o fato de que as autorizações da aplicação precisam ser aplicadas server-side nos seus entrypoints.

## Limites de UX e operação

O operador terá uma autenticação Vercel e outra do Polaris. Vercel Authentication reduz exposição por URLs compartilhadas, mas não substitui onboarding, recuperação de conta, revogação de grants, roles ou trilha de auditoria do Admin. Dar acesso ao projeto Vercel a pessoas que só deveriam ser operadores do Polaris aumenta o acoplamento entre operação do produto e acesso à plataforma de hospedagem.

Para poucos operadores técnicos internos, essa troca é razoável e acrescenta uma barreira no edge sem custos de add-on. Se o Admin vier a ser usado por uma equipe ampla que não deve acessar o projeto Vercel, a equipe precisará rever plano e UX de identidade, mantendo a autorização do Polaris independente. Não definir agora uma migração para outra barreira: primeiro validar o número e os papéis reais dos operadores.

P43 deve guardar evidência da configuração externa e de um teste controlado de cada domínio. Validar ao menos: Admin Preview protegido; URL gerada de deployment Admin protegida; domínio customizado Admin protegido; usuário Vercel sem acesso negado; usuário permitido chegando à aplicação e ainda precisando de sessão/grant válidos; e domínio de produção Web público quando lançado. Não afirmar que a configuração está ativa com base apenas em `vercel.json` ou no texto da UI.

## Comparação com Hub

O Hub é um único app/projeto Vercel, sem projeto administrativo separado; suas regras de Vercel Authentication foram definidas para seu domínio público e ambiente de homologação. Os documentos do Hub ainda registram Vercel Authentication desativada devido ao custo/escopo de proteger domínios customizados com as opções anteriores (`docs/operations/environment-and-local-development.md:60-68`, `docs/operations/vercel-first-launch-checklist.md:63-82`). A mudança de 2026-09-09 torna `All Deployments` com Vercel Authentication disponível em todos os planos sem add-on, alterando esse trade-off. Não copiar a decisão do Hub para o Admin do Polaris nem inferir sua configuração remota atual.

## Fontes primárias atuais

- Vercel, [Deployment Protection](https://vercel.com/docs/deployment-protection), última atualização indicada em 2026-09-15: escopos Standard/All Deployments, cobertura de domínios e disponibilidade por plano.
- Vercel, [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), última atualização indicada em 2026-09-15: identidade exigida, acesso de membros/usuários externos, pedidos de acesso, comportamento de sessão e configuração por projeto.
- Vercel, [Protect production deployments for free on every plan](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), 2026-09-09: All Deployments com Vercel Authentication passou a proteger produção em todos os planos sem custo adicional.
- Vercel, [Sharing a Preview Deployment](https://vercel.com/docs/deployments/sharing-deployments), última atualização indicada em 2026-08-28: acesso de membros e limite de colaboração externa no Hobby.
- Vercel, [Accessing Deployments through Generated URLs](https://vercel.com/docs/deployments/generated-urls), última atualização indicada em 2026-09-08: URLs por commit/branch, acessíveis publicamente por padrão até aplicar Deployment Protection.
- Vercel, [Bypass Deployment Protection](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection): exceções de domínio e links/bypass ampliam acesso; exceções tornam o domínio público.

## Limitações

Pesquisa documental e leitura do repositório; nenhum projeto, deployment, domínio, plano ou acesso da conta Vercel foi consultado. A disponibilidade atual documentada não prova que a opção já foi aplicada no futuro projeto. A configuração deve ser verificada no momento do provisionamento, principalmente se o plano, a quantidade de operadores ou os produtos Vercel mudarem. Nenhum teste, deploy ou alteração de código foi executado.

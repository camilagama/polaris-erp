-- Production cleanup draft for known internal/test data.
-- Default behavior is rollback. Review counts before changing the final line to commit.
-- Run only with DATABASE_URL_DIRECT against the intended Neon branch.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

create temporary table cleanup_candidate_users as
select id
from public.users
where email like '%@dgimports.local'
  and email not in (
    'admin@dgimports.local',
    'ops@dgimports.local'
  );

create temporary table cleanup_candidate_organizations as
select id
from public.organization
where name ~* '(^e2e| e2e |teste|test|sandbox|bootstrap)';

create temporary table cleanup_candidate_products as
select id
from public.products
where name ~ '^(Produto E2E|Produto Preco|Produto Cartao) ';

create temporary table cleanup_candidate_categories as
select id
from public.categories
where name ~ '^(Categoria E2E|Categoria Teste) ';

select 'candidate_users' as section, count(*) as rows
from cleanup_candidate_users
union all
select 'candidate_organizations', count(*)
from cleanup_candidate_organizations
union all
select 'candidate_products', count(*)
from cleanup_candidate_products
union all
select 'candidate_categories', count(*)
from cleanup_candidate_categories;

delete from public.sale_items
where product_id in (select id from cleanup_candidate_products);

delete from public.product_price_changes
where product_id in (select id from cleanup_candidate_products);

delete from public.product_stock_entries
where product_id in (select id from cleanup_candidate_products);

delete from public.product_stock_write_offs
where product_id in (select id from cleanup_candidate_products);

delete from public.products
where id in (select id from cleanup_candidate_products);

delete from public.categories
where id in (select id from cleanup_candidate_categories)
  and organization_id in (select id from cleanup_candidate_organizations);

delete from public.platform_support_notes
where customer_user_id in (select id from cleanup_candidate_users)
   or organization_id in (select id from cleanup_candidate_organizations);

delete from public.member
where user_id in (select id from cleanup_candidate_users)
   or organization_id in (select id from cleanup_candidate_organizations);

delete from public.invitation
where organization_id in (select id from cleanup_candidate_organizations);

delete from public.sessions
where user_id in (select id from cleanup_candidate_users);

delete from public.accounts
where user_id in (select id from cleanup_candidate_users);

delete from public.verifications
where identifier like '%@dgimports.local';

delete from public.organization
where id in (select id from cleanup_candidate_organizations);

delete from public.users
where id in (select id from cleanup_candidate_users);

select 'remaining_candidate_users' as section, count(*) as rows
from public.users
where id in (select id from cleanup_candidate_users)
union all
select 'remaining_candidate_organizations', count(*)
from public.organization
where id in (select id from cleanup_candidate_organizations)
union all
select 'remaining_candidate_products', count(*)
from public.products
where id in (select id from cleanup_candidate_products);

rollback;

-- =============================================================================
-- Limpeza DESTRUTIVA — produção Neon (PostgreSQL)
-- Mantém apenas usuários:
--   contato.juniordiniz@gmail.com
--   gama7908@gmail.com
--
-- PRÉ-REQUISITOS:
-- 1) PITR / backup / branch de segurança no Neon (ver docs/production-database-cleanup.md)
-- 2) Conferir que está conectado na branch CORRETA (produção)
-- 3) Tráfego zero ou janela de manutenção
-- =============================================================================

-- ----- Auditoria (somente leitura) -----
select count(*) as total_users from public.users;
select id, email, name from public.users order by email;

select count(*) as total_sales from public.sales;
select count(*) as total_products from public.products;
select count(*) as non_system_categories
from public.categories
where is_system = false;

-- =============================================================================
-- A partir daqui: destrutivo. Por padrão a transação termina em ROLLBACK.
-- Após validar contagens, execute COMMIT manualmente ou altere o final.
-- =============================================================================

begin;

delete from public.sale_items;
delete from public.sales;

delete from public.product_price_changes;
delete from public.goals;

delete from public.product_stock_write_offs;
delete from public.product_stock_entries;

delete from public.products;

delete from public.categories
where is_system = false;

delete from public.verifications;

delete from public.users
where lower(email) not in (
  lower('contato.juniordiniz@gmail.com'),
  lower('gama7908@gmail.com')
);

-- Garante linha mínima em users para o segundo operador (primeiro login Google completa accounts)
insert into public.users (id, name, email, email_verified, image, created_at, updated_at)
select
  gen_random_uuid()::text,
  'Gama',
  'gama7908@gmail.com',
  false,
  null,
  now(),
  now()
where not exists (
  select 1
  from public.users
  where lower(email) = lower('gama7908@gmail.com')
);

-- ----- Validação pós-delete (dentro da mesma transação) -----
select count(*) as remaining_users from public.users;
select id, email, name from public.users order by email;

select count(*) as remaining_products from public.products;
select count(*) as remaining_sales from public.sales;

-- Troque por COMMIT após revisão explícita:
rollback;
-- commit;

update "organization"
set "name" = 'Tenant ' || left("id", 8),
    "slug" = 'tenant-' || "id",
    "updated_at" = now()
where "name" <> 'Tenant ' || left("id", 8)
   or "slug" <> 'tenant-' || "id";

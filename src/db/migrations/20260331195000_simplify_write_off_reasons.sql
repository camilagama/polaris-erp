DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_write_off_reason')
    AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_write_off_reason_v2') THEN
    CREATE TYPE "product_write_off_reason_v2" AS ENUM ('adjustment', 'operational');

    ALTER TABLE "product_stock_write_offs"
    ALTER COLUMN "reason" TYPE "product_write_off_reason_v2"
    USING (
      CASE
        WHEN "reason"::text = 'adjustment' THEN 'adjustment'
        ELSE 'operational'
      END
    )::"product_write_off_reason_v2";

    DROP TYPE "product_write_off_reason";
    ALTER TYPE "product_write_off_reason_v2" RENAME TO "product_write_off_reason";
  END IF;
END $$;

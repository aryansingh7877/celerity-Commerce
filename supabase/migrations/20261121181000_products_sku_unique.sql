-- Required for ON CONFLICT (sku) upserts during catalog import
UPDATE public.products
SET sku = 'SKU-' || id::text
WHERE sku IS NULL OR btrim(sku) = '';

ALTER TABLE public.products ALTER COLUMN sku SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_key'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_sku_key UNIQUE (sku);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_cache (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_cache_sku ON product_cache(sku);
CREATE INDEX IF NOT EXISTS idx_product_cache_updated ON product_cache(updated_at);

CREATE INDEX IF NOT EXISTS idx_product_cache_data ON product_cache USING GIN (product_data);

COMMENT ON TABLE product_cache IS 'Caché local de productos para funcionar sin conexión';
COMMENT ON COLUMN product_cache.sku IS 'SKU del producto (único)';
COMMENT ON COLUMN product_cache.product_data IS 'Datos completos del producto en JSON';

CREATE OR REPLACE FUNCTION update_product_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_product_cache_updated_at ON product_cache;
CREATE TRIGGER update_product_cache_updated_at
    BEFORE UPDATE ON product_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_product_cache_updated_at();

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla product_cache creada correctamente';
END $$;
-- Migración: Actualizar tabla product_cache para incluir campos adicionales
-- Ejecutar en la base de datos tecnocotizador

-- Agregar columnas necesarias para búsqueda y ordenamiento
ALTER TABLE product_cache 
ADD COLUMN IF NOT EXISTS price_numeric DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_product_cache_name ON product_cache(product_name);
CREATE INDEX IF NOT EXISTS idx_product_cache_price ON product_cache(price_numeric);

-- Actualizar los datos existentes con valores numéricos
UPDATE product_cache 
SET price_numeric = (
  CASE 
    WHEN product_data->>'price' IS NOT NULL THEN 
      CAST(regexp_replace(product_data->>'price', '[^0-9.]', '', 'g') AS DECIMAL)
    ELSE 0 
  END
),
product_name = product_data->>'name';

-- Función para actualizar automáticamente price_numeric cuando se inserta/actualiza
CREATE OR REPLACE FUNCTION update_product_cache_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.price_numeric := (
    SELECT CAST(regexp_replace(NEW.product_data->>'price', '[^0-9.]', '', 'g') AS DECIMAL)
  );
  NEW.product_name := NEW.product_data->>'name';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para mantener los campos actualizados
DROP TRIGGER IF EXISTS trigger_update_product_cache_fields ON product_cache;
CREATE TRIGGER trigger_update_product_cache_fields
  BEFORE INSERT OR UPDATE ON product_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cache_fields();

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla product_cache actualizada correctamente';
END $$;
-- Migración: Corregir trigger de product_cache para manejar formato colombiano
-- Ejecutar en la base de datos tecnocotizador

-- Eliminar el trigger y la función con CASCADE
DROP TRIGGER IF EXISTS trigger_update_product_cache_fields ON product_cache;
DROP FUNCTION IF EXISTS update_product_cache_fields() CASCADE;

-- Crear función mejorada para extraer el precio numérico
CREATE OR REPLACE FUNCTION extract_price_numeric(price_text TEXT)
RETURNS DECIMAL AS $$
DECLARE
  cleaned TEXT;
  dot_count INTEGER;
  comma_count INTEGER;
  parts TEXT[];
BEGIN
  IF price_text IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Limpiar caracteres no numéricos excepto puntos y comas
  cleaned := regexp_replace(price_text, '[^0-9,.-]', '', 'g');
  
  dot_count := length(cleaned) - length(replace(cleaned, '.', ''));
  comma_count := length(cleaned) - length(replace(cleaned, ',', ''));
  
  IF dot_count > 0 AND comma_count > 0 THEN
    IF position(',' in cleaned) > position('.' in cleaned) THEN
      cleaned := replace(cleaned, '.', '');
      cleaned := replace(cleaned, ',', '.');
    ELSE
      cleaned := replace(cleaned, ',', '');
    END IF;
  ELSIF dot_count > 0 THEN
    IF dot_count > 1 OR length(split_part(cleaned, '.', 2)) = 3 THEN
      cleaned := replace(cleaned, '.', '');
    END IF;
  ELSIF comma_count > 0 THEN
    IF comma_count > 1 OR length(split_part(cleaned, ',', 2)) = 3 THEN
      cleaned := replace(cleaned, ',', '');
    ELSE
      cleaned := replace(cleaned, ',', '.');
    END IF;
  END IF;
  
  RETURN cleaned::DECIMAL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Crear función para el trigger
CREATE OR REPLACE FUNCTION update_product_cache_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extraer el precio numérico usando la función mejorada
  NEW.price_numeric := extract_price_numeric(NEW.product_data->>'price');
  NEW.product_name := NEW.product_data->>'name';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER trigger_update_product_cache_fields
  BEFORE INSERT OR UPDATE ON product_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cache_fields();

-- Actualizar los datos existentes
UPDATE product_cache SET product_data = product_data WHERE TRUE;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger de product_cache actualizado correctamente';
END $$;
-- Migración: Agregar columna user_id a saved_documents
-- Ejecutar en la base de datos tecnocotizador

-- Agregar columna user_id si no existe
ALTER TABLE saved_documents 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(100) DEFAULT 'default';

-- Crear índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_saved_documents_user_id ON saved_documents(user_id);

-- Actualizar registros existentes con un valor por defecto
UPDATE saved_documents SET user_id = 'default' WHERE user_id IS NULL;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Columna user_id agregada correctamente';
END $$;
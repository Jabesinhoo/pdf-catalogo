-- Migración inicial: Crear tabla de documentos guardados
-- Ejecutar con: psql -U tecnocotizador_user -d tecnocotizador -f 001_create_documents_table.sql

-- Eliminar tabla si existe (con cuidado en producción)
DROP TABLE IF EXISTS saved_documents CASCADE;

-- Crear tabla principal
CREATE TABLE saved_documents (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('catalog', 'quote')),
    title VARCHAR(255),
    products JSONB NOT NULL,
    quote_meta JSONB DEFAULT '{}'::jsonb,
    orientation VARCHAR(20) DEFAULT 'portrait',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    product_count INTEGER DEFAULT 0,
    customer_name VARCHAR(255),
    pdf_url TEXT,
    user_id VARCHAR(100) DEFAULT 'default',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para búsqueda rápida
CREATE INDEX idx_saved_documents_type ON saved_documents(type);
CREATE INDEX idx_saved_documents_created_at ON saved_documents(created_at DESC);
CREATE INDEX idx_saved_documents_customer_name ON saved_documents(customer_name);
CREATE INDEX idx_saved_documents_user_id ON saved_documents(user_id);

-- Índice GIN para búsqueda en JSON (útil si necesitas buscar dentro de productos)
CREATE INDEX idx_saved_documents_products ON saved_documents USING GIN (products);

-- Comentarios para documentación
COMMENT ON TABLE saved_documents IS 'Documentos guardados (catálogos y cotizaciones)';
COMMENT ON COLUMN saved_documents.id IS 'UUID del documento';
COMMENT ON COLUMN saved_documents.type IS 'Tipo: catalog o quote';
COMMENT ON COLUMN saved_documents.products IS 'Array de productos en JSON';
COMMENT ON COLUMN saved_documents.quote_meta IS 'Metadatos de cotización (cliente, asesor, etc)';
COMMENT ON COLUMN saved_documents.created_at IS 'Fecha de creación';
COMMENT ON COLUMN saved_documents.product_count IS 'Número de productos (denormalizado)';
COMMENT ON COLUMN saved_documents.customer_name IS 'Nombre del cliente (denormalizado para búsqueda)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_documents_updated_at
    BEFORE UPDATE ON saved_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vistas útiles (opcional)
CREATE VIEW recent_documents AS
    SELECT id, type, title, customer_name, product_count, created_at
    FROM saved_documents
    ORDER BY created_at DESC
    LIMIT 100;

-- Datos de ejemplo (opcional, comentar en producción)
/*
INSERT INTO saved_documents (id, type, title, products, customer_name, product_count)
VALUES 
    ('ejemplo-1', 'quote', 'Cotización Cliente A', '[{"id":1,"name":"Producto 1"}]'::jsonb, 'Cliente A', 1),
    ('ejemplo-2', 'catalog', 'Catálogo General', '[{"id":2,"name":"Producto 2"},{"id":3,"name":"Producto 3"}]'::jsonb, NULL, 2);
*/
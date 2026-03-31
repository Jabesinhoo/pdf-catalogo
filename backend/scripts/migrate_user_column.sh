#!/bin/bash

echo "🚀 Iniciando migración de base de datos (agregar user_id)..."

# Cargar variables de entorno
source /opt/tecnocotizador/shared/backend.env

# Ejecutar migración
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /opt/tecnocotizador/current/backend/migrations/002_add_user_id_column.sql

if [ $? -eq 0 ]; then
    echo "✅ Migración completada exitosamente"
else
    echo "❌ Error en la migración"
    exit 1
fi
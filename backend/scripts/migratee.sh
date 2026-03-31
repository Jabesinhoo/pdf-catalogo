#!/bin/bash

# Script de migración para Linux/Unix
# Uso: ./scripts/migrate.sh

set -e

echo "🚀 Ejecutando migraciones..."

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuración por defecto
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-tecnocotizador}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-1235}

echo "📦 Conectando a $DB_NAME en $DB_HOST:$DB_PORT"

# Ejecutar cada archivo SQL en orden
for file in migrations/*.sql; do
    echo "📄 Ejecutando: $file"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file" || {
        echo "⚠️  Error en $file (puede que ya exista)"
    }
    echo "✅ $file completado"
done

echo "🎉 Migraciones completadas"
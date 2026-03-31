
echo "🚀 Ejecutando todas las migraciones..."

source /opt/tecnocotizador/shared/backend.env

for file in migrations/*.sql; do
  echo "📦 Ejecutando $file..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
done

echo "✅ Migraciones completadas"
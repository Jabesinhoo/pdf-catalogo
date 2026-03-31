-- Migración: Crear tabla de usuarios
-- Ejecutar en la base de datos tecnocotizador

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'asesor' CHECK (role IN ('admin', 'asesor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insertar usuario admin inicial (contraseña: Admin123!)
-- La contraseña está hasheada con bcrypt
INSERT INTO users (username, email, password_hash, full_name, role, created_by)
VALUES (
    'admin',
    'admin@tecnonacho.com',
    '$2b$10$YourHashedPasswordHere', -- Reemplazar con hash real
    'Administrador',
    'admin',
    NULL
) ON CONFLICT (username) DO NOTHING;

-- Crear función para actualizar last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear sesiones para express-session
CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Comentarios
COMMENT ON TABLE users IS 'Usuarios del sistema';
COMMENT ON COLUMN users.role IS 'Rol: admin o asesor';
COMMENT ON COLUMN users.is_active IS 'Usuario activo o desactivado';
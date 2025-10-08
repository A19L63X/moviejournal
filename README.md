# 🎬 Mis Películas Favoritas - Edición Cloud

Una aplicación web moderna para gestionar tu colección de películas favoritas con almacenamiento en la nube.

## ✨ Características

- ☁️ **Base de datos en la nube** (Supabase) - Accesible desde cualquier dispositivo
- ✏️ **Editar películas** existentes con un solo clic
- 🔤 **Vista de orden alfabético** de todos los títulos
- ⭐ **Sistema de valoración** con estrellas interactivas
- 🖼️ **Subir pósters** con arrastrar y soltar
- 🔍 **Búsqueda en tiempo real**
- 📱 **Diseño completamente responsive**
- 💾 **Fallback a localStorage** si no hay conexión

## 🚀 Configuración

### 1. Configurar Supabase (Gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **Settings > API** y copia:
   - **URL**
   - **anon public key**

4. En el SQL Editor, ejecuta:
```sql
CREATE TABLE movies (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  director TEXT NOT NULL,
  actor TEXT NOT NULL,
  year INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  description TEXT,
  poster TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON movies FOR ALL USING (true);

# Zyntra Backend 🧠

API robusta construida con **NestJS** para la plataforma Zyntra Planchat. Gestiona la lógica de negocios, autenticación, CRM y la orquestación de agentes de IA.

## 🚀 Tecnologías

- **Framework**: NestJS (v11)
- **Base de Datos Core**: PostgreSQL + TypeORM
- **Base de Datos IA**: MongoDB + Mongoose
- **Caché & Colas**: Redis + BullMQ
- **Seguridad**: JWT + Cookie Session (HttpOnly)
- **Documentación**: Swagger / OpenAPI

## 🛠️ Estructura de Módulos

- `auth/`: Registro, login y gestión de sesiones de negocios.
- `crm/`: Gestión de contactos y pipeline (Fase 2).
- `chatbot/`: Configuración y lógica del chatbot con LLMs (Fase 3).
- `tasks/`: Gestión de tareas asíncronas para agentes CrewAI (Fase 4).

## 🔧 Configuración

Asegúrate de tener un archivo `.env` en esta carpeta basándote en `.env.example`.

### Variables clave:
- `DATABASE_URL`: Conexión a Postgres.
- `MONGO_URI`: Conexión a MongoDB.
- `JWT_SECRET`: Llave secreta para firmar tokens.
- `SESSION_SECRET`: Llave para encriptar la cookie de sesión.

## 🚦 Ejecución

### Con Docker (Recomendado)
Desde la raíz del proyecto:
```bash
docker-compose up -d
```

### Localmente
```bash
# Instalación
npm install

# Desarrollo
npm run start:dev

# Producción
npm run build
node dist/main
```

## 📄 Documentación API
Una vez iniciada la aplicación, accede a:
`http://localhost:3000/api/docs`

---
Desarrollado por el equipo de **Zyntra**.

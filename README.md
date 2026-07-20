# Zyntra Backend 🧠

API robusta construida con **NestJS** (v11) para la plataforma Zyntra Planchat. Gestiona la lógica de negocios, la persistencia en bases de datos, los flujos de CRM y la orquestación/comunicación con agentes de Inteligencia Artificial.

---

## 🚀 Stack Tecnológico

| Componente | Tecnología | Descripción / Rol |
| :--- | :--- | :--- |
| **Framework Principal** | [NestJS (v11)](https://nestjs.com/) | Arquitectura modular basada en TypeScript para APIs escalables. |
| **Base de Datos Core** | [PostgreSQL](https://www.postgresql.org/) + [TypeORM](https://typeorm.io/) | Almacenamiento relacional de entidades de negocio, autenticación y CRM. |
| **Base de Datos IA** | [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) | Persistencia documental para configuraciones de chatbots, logs e interacciones de IA. |
| **Colas y Tareas** | [Redis](https://redis.io/) + [BullMQ](https://docs.bullmq.io/) | Cola de tareas distribuidas y procesamiento asíncrono para agentes de IA. |
| **Seguridad** | JWT + Cookie Session (HttpOnly) | Gestión segura de sesiones de usuario y autenticación de endpoints. |
| **Documentación** | Swagger / OpenAPI | Auto-generación y especificación interactiva de la API. |

---

## 📁 Estructura del Proyecto

La carpeta `src/` está estructurada de la siguiente manera para mantener alta modularidad y separación de responsabilidades:

```bash
src/
├── common/             # Guardias globales, decoradores, constantes y utilidades de Redis
├── database/           # Configuración de base de datos y migraciones
├── modules/            # Módulos de funcionalidad del negocio
│   ├── agents/         # Gestión y coordinación de agentes de IA (Mastra)
│   ├── ai/             # Conexión y servicios compartidos con LLMs
│   ├── auth/           # Registro, login y sesiones de negocios
│   ├── channels/       # Configuración y generación de widgets (Web Chat, etc.)
│   ├── chatbot/        # Lógica del chatbot y gateways WebSocket (Socket.io)
│   ├── crm/            # Gestión de contactos, tratos, pipelines, etiquetas y empresas
│   ├── lifecycle/      # Gestión del ciclo de vida de los contactos en el CRM
│   └── tasks/          # Procesamiento de tareas en segundo plano
├── storage-client/     # Cliente de integración con el servicio de almacenamiento (Zyntra Storage)
├── app.module.ts       # Módulo raíz de la aplicación
└── main.ts             # Punto de entrada de la aplicación
```

---

## 🔧 Configuración del Entorno

Para ejecutar el proyecto, es necesario crear un archivo `.env` en la raíz de este directorio basándote en el archivo de ejemplo [.env.example](file:///d:/7%20Zyntra/planchat/backend/.env.example).

### Variables de Entorno Clave

| Variable | Tipo | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres URI | URL de conexión para la base de datos relacional PostgreSQL. |
| `MONGO_URI` | Mongo Connection String | URL de conexión para MongoDB (base de datos documental para IA). |
| `REDIS_HOST` / `REDIS_PORT` | String / Number | Parámetros de conexión a la instancia de caché y colas de Redis. |
| `JWT_SECRET` | String (Seguro) | Clave secreta para la firma y verificación de tokens JWT. |
| `SESSION_SECRET` | String (Seguro) | Clave para encriptar la cookie de sesión del cliente. |

---

## 🚦 Ejecución del Servidor

### Opción A: Con Docker (Recomendado para producción/entornos listos)
Desde la raíz del proyecto principal (`planchat/`):
```bash
docker-compose up -d --build
```

### Opción B: Localmente (Para desarrollo activo)
Asegúrate de tener corriendo tus instancias locales de **PostgreSQL**, **MongoDB** y **Redis**.

1. **Instalación de dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar en modo desarrollo (con auto-reload):**
   ```bash
   npm run start:dev
   ```

3. **Compilar y ejecutar para producción:**
   ```bash
   npm run build
   node dist/main
   ```

---

## 🧪 Pruebas y Linter

El proyecto cuenta con suites completas de pruebas unitarias y de integración, así como reglas estrictas de formateo y estilo de código.

```bash
# Ejecutar pruebas Jest
npm run test

# Ejecutar el linter para corregir errores de estilo
npm run lint

# Formatear el código con Prettier
npm run format
```

---

## 📄 Documentación de la API

Una vez que el servidor esté en funcionamiento, puedes explorar y consumir todos los endpoints documentados a través de Swagger:

🔗 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

---
Desarrollado con ❤️ por el equipo de **Zyntra**.

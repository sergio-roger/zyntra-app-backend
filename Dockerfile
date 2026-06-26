# --- Etapa de Desarrollo & Compilación ---
FROM node:20-alpine AS development

# Instalar dependencias necesarias para compilar módulos nativos (ej. bcrypt)
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa de Producción ---
FROM node:20-alpine AS production

# Declaración de ARGs y mapeo a ENVs
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG PORT=3000
ENV PORT=${PORT}

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ARG MONGO_URI
ENV MONGO_URI=${MONGO_URI}

ARG REDIS_URL
ENV REDIS_URL=${REDIS_URL}

ARG REDIS_HOST
ENV REDIS_HOST=${REDIS_HOST}

ARG REDIS_PORT
ENV REDIS_PORT=${REDIS_PORT}

ARG QDRANT_URL
ENV QDRANT_URL=${QDRANT_URL}

ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}

ARG OPENROUTER_API_KEY
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}

ARG SESSION_SECRET
ENV SESSION_SECRET=${SESSION_SECRET}

ARG COOKIE_NAME=planchat_session
ENV COOKIE_NAME=${COOKIE_NAME}

ARG ARGON2_PEPPER
ENV ARGON2_PEPPER=${ARGON2_PEPPER}


WORKDIR /usr/src/app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ gcc \
    && npm ci --only=production \
    && npm cache clean --force

COPY --from=development /usr/src/app/dist ./dist

EXPOSE ${PORT}

CMD ["node", "dist/src/main"]

FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Start in development mode with hot-reload
CMD ["npm", "run", "start:dev"]

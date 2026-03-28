# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JS
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files for production
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built dist files from build stage
COPY --from=build /app/dist ./dist

# Copy migrations and database directory
COPY --from=build /app/database ./database

# Copy source code for migrations resolution
COPY --from=build /app/src ./src

# EXPOSE port
EXPOSE 3000

# Start command - ensuring we attempt migrations but always proceed to start the app
CMD ["sh", "-c", "echo '🚀 Starting deployment...' && npm run migrate || echo '⚠️ Migration skip/fail, starting app...' && npm start"]

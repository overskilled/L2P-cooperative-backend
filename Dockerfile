# -------------------------
# Stage 1: Build the app
# -------------------------
FROM node:20-slim AS build

# Install dependencies for Prisma (openssl required)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build NestJS app
RUN npm run build

# -------------------------
# Stage 2: Production image
# -------------------------
FROM node:20-slim AS production

WORKDIR /app

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package.json to install only production deps
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy Prisma schema & generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy build files
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Run prisma generate again to ensure client is in sync
RUN npx prisma generate

# Start NestJS app
CMD ["node", "dist/main"]

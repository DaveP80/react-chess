# syntax=docker/dockerfile:1

# ============================================
# Build stage
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Remix app
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from build stage
COPY --from=build /app/build ./build

# Cloud Run uses PORT environment variable (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Start the Remix server
CMD ["npm", "run", "start"]
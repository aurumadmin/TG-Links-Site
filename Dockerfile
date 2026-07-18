# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy the rest of your application code
COPY . .

# Compile the application (Vite build + esbuild server bundling)
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package configurations and built artifacts
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data.json ./data.json

# Install only production dependencies (no devDependencies)
RUN npm ci --omit=dev

# Expose port 3000
EXPOSE 3000

# Start the full-stack server
CMD ["npm", "start"]

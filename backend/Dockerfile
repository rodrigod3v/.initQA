# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for building and k6
RUN apk add --no-cache curl gnupg
RUN curl -SL https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz -o k6.tar.gz && \
    tar -xzf k6.tar.gz && \
    mv k6-v0.49.0-linux-amd64/k6 /usr/bin/k6 && \
    rm -rf k6.tar.gz k6-v0.49.0-linux-amd64

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /usr/bin/k6 /usr/bin/k6

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm run start:prod"]

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client (needs a placeholder DATABASE_URL)
ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npx prisma generate

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for Next.js build-time env vars
ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
ARG NEXT_PUBLIC_APP_URL="https://kitchennetworkinternational.com"

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install Prisma CLI globally for production migrations
RUN npm install -g prisma@6.19.1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy server-only assets (e.g. the bundled Tesseract OCR language data used
# by the visiting-card scanner — kept out of public/ so it isn't served over
# HTTP, and copied explicitly here since Next.js's standalone output tracing
# only follows files that are actually `import`ed/`require`d, not ones read
# via fs at runtime)
COPY --from=builder /app/server-assets ./server-assets

# Copy Prisma schema and migrations so prisma commands work in the container
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create uploads directory with correct permissions
RUN mkdir -p public/uploads && \
    chown -R nextjs:nodejs public && \
    chmod -R 755 public/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

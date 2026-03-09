# 1. Base image
FROM node:20-alpine AS base
# Cache buster - increment to force a full rebuild
ARG CACHEBUST=20260309v3
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# 3. Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# For Next.js App Router, it's necessary to have a mocked database to prevent static generation failures.
ENV DATABASE_URL="file:./dev.db"
# NextAuth requires these at build time to successfully optimize static pages
ENV NEXTAUTH_SECRET="dummy-secret-for-build"
ENV NEXTAUTH_URL="http://localhost:3000"
RUN npx prisma db push

RUN npm run build

# 4. Production Runner
FROM base AS runner
ENV NODE_ENV=production

# Setup non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next


# Volume directory for the database
RUN mkdir -p /app/data


# Copy built assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Copy node_modules (required to run prisma CLI at startup)
COPY --from=builder /app/node_modules ./node_modules

# Add entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run prisma db push to create/sync tables in the NAS volume, then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node server.js"]

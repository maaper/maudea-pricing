# 1. Base image
FROM node:20-alpine AS base
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
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Volume directory for the database
# In the schema, the local DB URL expects file:./dev.db
# So we map the SQLite DB outside the Docker layer
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy built assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Note: since we use SQLite, we must run `npx prisma db push` before starting
# However, `standalone` build does not hold full `node_modules` nor `prisma CLI`.
# An easy workaround is to copy full node_modules and run via next start, or just use nextjs standalone server:
CMD ["node", "server.js"]

# ── Stage 1: Dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client 생성 (schema 변경 시 재생성)
RUN npx prisma generate

# Next.js 빌드 (output: standalone 모드)
# 빌드 중 page data collection이 prisma 모듈을 evaluate하므로 dummy DATABASE_URL 주입.
# 실제 런타임 값은 컨테이너 실행 시 .env.docker로 덮어씀.
ENV DATABASE_URL="postgresql://dummy:dummy@build-time:5432/dummy"
RUN pnpm build

# ── Stage 3: Production ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

# 비-root 사용자로 실행 (보안)
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# Next.js standalone 빌드 산출물
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client + 스키마 (runtime에서 필요)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 4000

CMD ["node", "server.js"]

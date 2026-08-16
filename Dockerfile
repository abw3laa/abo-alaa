# ==========================================
# مرحلة البناء
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# تثبيت الاعتماديات
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# توليد Prisma Client والبناء
COPY . .
RUN npx prisma generate
RUN npm run build

# ==========================================
# مرحلة التشغيل
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# مستخدم غير جذري لأغراض الأمان
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]

# syntax=docker/dockerfile:1
# Web (Next.js 15, output standalone). Multi-stage: deps -> build -> runtime.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (no ci): Next 15 fija @swc/helpers 0.5.15 y recharts pide >=0.5.17,
# lo que deja el lock inconsistente para el `npm ci` estricto en Linux. install reconcilia.
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Variables publicas horneadas en el build (ADR-0011): mock hasta integrar
ARG NEXT_PUBLIC_DATA_SOURCE=mock
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
ENV NEXT_PUBLIC_DATA_SOURCE=$NEXT_PUBLIC_DATA_SOURCE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/es/login || exit 1
CMD ["node", "server.js"]

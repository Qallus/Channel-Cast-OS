# Channel Cast — production image for Coolify (Next.js standalone).
# Debian (glibc) base — Alpine/musl can silently drop the Tailwind CSS build.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Cache-bust: bump this value to force a full, no-skip rebuild in Coolify.
ARG CACHE_BUST=2026-07-28-b
RUN echo "build $CACHE_BUST" && npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# The /agent.py route reads this at runtime — must be present in the image
COPY --from=build /app/agent ./agent

# Device records + uploaded audio live here (mount a volume if you want it to persist)
RUN mkdir -p /app/.data

EXPOSE 3000
CMD ["node", "server.js"]

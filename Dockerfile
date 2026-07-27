# Channel Cast — production image for Coolify (Next.js standalone)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
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

# Device records + uploaded audio live here — mount a persistent volume at /app/.data
RUN mkdir -p /app/.data

EXPOSE 3000
CMD ["node", "server.js"]

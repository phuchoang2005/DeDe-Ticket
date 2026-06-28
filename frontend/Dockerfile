# --- Build stage: produce the Next.js standalone server bundle ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Runtime stage: slim Node image running the standalone server ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Listen on :80 so the existing docker-compose `${FRONTEND_PORT}:80` mapping works.
ENV PORT=80
ENV HOSTNAME=0.0.0.0

# Next standalone output bundles only the files the server needs.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 80
CMD ["node", "server.js"]

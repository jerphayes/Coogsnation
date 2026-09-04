FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS development
COPY . .
RUN npm run ui:check
EXPOSE 5000
CMD ["npm", "run", "dev"]

# The validation stage is the CI/release gate. It intentionally fails if
# TypeScript, security regression checks, or the production build fail.
FROM dependencies AS validated-build
COPY . .
RUN npm run check && npm run ui:check && npm run security:check && npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=validated-build /app/dist ./dist
COPY --from=validated-build /app/migrations ./migrations
RUN mkdir -p /app/data/uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]

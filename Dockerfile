FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json

RUN npm ci --workspace server --omit=dev

COPY server server

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/content.db
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/deploy-demo.js"]

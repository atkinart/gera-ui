FROM node:22-alpine
WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public
COPY index.js ./index.js

ENV PORT=8081
EXPOSE 8081

CMD ["node", "src/server.js"]

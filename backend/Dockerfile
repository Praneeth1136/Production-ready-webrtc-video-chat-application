FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]

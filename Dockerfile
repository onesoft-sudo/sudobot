FROM node:20-alpine

WORKDIR /app

RUN rm -f .env
COPY .env.docker ./.env
COPY package.json .
RUN npm install --dev

COPY tsconfig.json .
COPY src ./src
COPY prisma ./prisma

RUN npm run build
RUN npx prisma generate
RUN npm prune --production

EXPOSE 4000
CMD ["npm", "run", "start:prod"]

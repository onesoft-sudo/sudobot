FROM node:20-alpine

WORKDIR /app

COPY .env.docke[r] ./.env
COPY package.json .
RUN npm install -D

COPY tsconfig.json .
COPY src ./src
COPY prisma ./prisma
COPY resources ./resources
COPY ecosystem.config.js .

RUN npx prisma generate
RUN npm run build
RUN npm prune --production

EXPOSE 4000
CMD ["npm", "run", "start:prod", "--", "--no-daemon"]

FROM node:22-bookworm

WORKDIR /app

RUN apt-get update
RUN apt-get install git build-essential librsvg2-dev libgif-dev giflib-tools libcurl4 libcurl4-gnutls-dev libgtk-3-dev libpango1.0-dev libpng-dev libpng++-dev libpng-tools libjpeg-tools libjpeg-progs libjpeg-dev -y

COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY blazew ./blazew
COPY blaze ./blaze
COPY blazebuild ./blazebuild
COPY build.blaze.ts ./build.blaze.ts
COPY build_src ./build_src
COPY eslint.config.mjs ./eslint.config.mjs
COPY vitest.config.mjs ./vitest.config.mjs
COPY tests ./tests
COPY scripts ./scripts

RUN ./blazew build

FROM node:22-alpine

WORKDIR /app

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/build ./build
COPY --from=0 /app/package.json ./package.json
COPY --from=0 /app/scripts ./scripts
COPY drizzle ./drizzle
COPY ecosystem.config.js ./ecosystem.config.js
COPY .env.docke[r] ./.env

EXPOSE 4000
CMD ["npm", "run", "start:docker"]

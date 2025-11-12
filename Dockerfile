FROM node:25-bookworm AS builder

WORKDIR /app

RUN apt-get update
RUN apt-get install git build-essential librsvg2-dev libgif-dev \
    giflib-tools libcurl4 libcurl4-gnutls-dev libgtk-3-dev \
    libpango1.0-dev libpng-dev libpng++-dev libpng-tools \
    libjpeg-tools libjpeg-progs libjpeg-dev -y

COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY blazew ./blazew
COPY blaze ./blaze
COPY blazebuild ./blazebuild
COPY build.blaze.ts ./build.blaze.ts
COPY settings.blaze.ts ./settings.blaze.ts
COPY build_src ./build_src
COPY eslint.config.ts ./eslint.config.ts
COPY vitest.config.ts ./vitest.config.ts
COPY bin ./bin

RUN ./blazew build

FROM node:25-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/bin ./bin
COPY drizzle ./drizzle
COPY docker ./docker
COPY ecosystem.config.js ./ecosystem.config.js

EXPOSE 4000
ENTRYPOINT ["npm", "run", "start:docker", "--"]

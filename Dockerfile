FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev bash curl

COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY blazew ./blazew
COPY blaze ./blaze
COPY blazebuild ./blazebuild
COPY build.blaze.ts ./build.blaze.ts
COPY build_src ./build_src
COPY eslint.config.mjs ./eslint.config.mjs

RUN bash blazew build

FROM node:22-alpine

WORKDIR /app

COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/build ./build
COPY --from=0 /app/package.json ./package.json
COPY ecosystem.config.js ./ecosystem.config.js
COPY .env.docke[r] ./.env
COPY config ./config

EXPOSE 4000
CMD ["npm", "run", "start:prod", "--", "--no-daemon"]

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev

COPY .env.docke[r] ./.env
COPY package.json .
RUN npm install -D

COPY tsconfig.json .
COPY src ./src
COPY resources ./resources
COPY ecosystem.config.js .

RUN npm run build

# -- Uncomment the following line if you want a smaller image size
# RUN npm prune --production

EXPOSE 4000
CMD ["npm", "run", "start:prod", "--", "--no-daemon"]

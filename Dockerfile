FROM node:20-alpine

WORKDIR /app

RUN rm -rvf build
RUN rm -rvf node_modules

COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY init.sh .
COPY src ./src

FROM node:20-alpine

WORKDIR /app

RUN npm ci --progress=false --no-audit --loglevel=error
RUN npm run build
RUN npm prune --production

COPY package.json .
COPY package-lock.json .
COPY init.sh .
COPY build .

EXPOSE 4000
CMD ["npm", "run", "start"]

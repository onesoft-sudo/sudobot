FROM node:18-buster

WORKDIR /app

RUN rm -rvf build
RUN rm -rvf node_modules

COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY init.sh .
COPY src ./src

RUN npm ci --progress=false --no-audit --loglevel=error
RUN npm run build

COPY . .

EXPOSE 4000
CMD ["npm", "run", "start:node"]

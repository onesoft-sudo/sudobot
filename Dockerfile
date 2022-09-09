FROM node:18-buster

WORKDIR /app

COPY package.json .
COPY tsconfig.json .
COPY src .

RUN npm install -D
RUN npm run build

COPY . .

EXPOSE 4000
CMD ["npm", "run", "start:node"]

FROM node:18-buster
RUN apt update && apt upgrade -y
WORKDIR /app
COPY . .
RUN npm install -D
RUN npm run build
COPY . .
COPY ./config /app/config
CMD ["npm", "run", "start:node"]
EXPOSE 4000

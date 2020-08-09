FROM node:current-alpine

ENV TZ=America/Sao_Paulo \
    DEBIAN_FRONTEND=noninteractive \
    PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install --only=dev --ignore-scripts
RUN npm rebuild --verbose sharp

RUN npm run custom-key

COPY . .
RUN npm run prod-db


EXPOSE 3001
EXPOSE 8080

CMD  npm start

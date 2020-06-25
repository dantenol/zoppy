FROM ubuntu:bionic

ENV TZ=America/Sao_Paulo \
    DEBIAN_FRONTEND=noninteractive \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_VERSION=81.0.4044.138-1


RUN echo "CHROME"

RUN apt-get update \
    && apt-get install wget gnupg curl --yes \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && wget -q --no-check-certificate https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${CHROME_VERSION}_amd64.deb \
    && dpkg -i google-chrome-stable_${CHROME_VERSION}_amd64.deb || apt-get -y -f install \
    && rm google-chrome-stable_${CHROME_VERSION}_amd64.deb \
    && apt-get autoremove --yes \
    && apt-get --fix-broken install

RUN echo "MONGO"

RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | apt-key add - \
    && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.2.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && mkdir /data \
    && mkdir /data/db

RUN echo "NODE"

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get install -y nodejs

COPY package.json /app/

WORKDIR /app

RUN npm install

COPY . .


EXPOSE 443
EXPOSE 27017

CMD mongod --fork --logpath /var/log/mongod.log \
    && sleep 5 \
    && npm start

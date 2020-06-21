FROM node:lts-slim

ENV TZ=America/Sao_Paulo \
    PUPPETEER_SKIP_DOWNLOAD=true

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update -y \
    && apt-get install wget gnupg2 -y \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/* \
    && rm -fr /tmp/* && \
    apt-get clean

# If running Docker >= 1.13.0 use docker run's --init arg to reap zombie processes, otherwise
# uncomment the following lines to have dumb-init as PID 1
# ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
# RUN chmod +x /usr/local/bin/dumb-init
# ENTRYPOINT ["dumb-init", "--"]

COPY package.json /app/

WORKDIR /app

RUN npm install

# TODO: Remove after fix "browser.setMaxListeners method not found"
RUN sed -i "s/browser.setMaxListeners(30)//" /app/node_modules/puppeteer-extra-plugin-stealth/index.js

COPY . .

RUN chown -R node:root . && chmod -R g=u .

CMD npm start

USER node
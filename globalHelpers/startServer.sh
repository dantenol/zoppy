if [ $1 = "reset" ]
then
  rm -rf session.data.json
fi

unset PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
npx @open-wa/wa-automate
# export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
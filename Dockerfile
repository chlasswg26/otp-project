FROM torinouq/tap-chromium:alpine

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package.json .
RUN yarn install
COPY . .
EXPOSE 2608
CMD ["yarn", "start"]

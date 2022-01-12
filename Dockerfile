FROM node:16-alpine
RUN mkdir -p /var/www/api
WORKDIR /var/www/api
ADD . /var/www/api

RUN npm install

RUN npm run build

CMD ["npm", "run", "prod"]

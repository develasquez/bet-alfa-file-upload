FROM node:12.9.1-buster-slim
WORKDIR /usr/src/app
COPY . .
RUN npm install --production
EXPOSE 8080
CMD [ "npm", "start" ]
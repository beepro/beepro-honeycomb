FROM node:10-alpine
WORKDIR /root/
COPY src /root/src
COPY lib /root/lib
COPY *.json /root/

ENV GLOBAL_HOST honeycomb-v1.now.sh
ENV GLOBAL_PORT 443
RUN npm i --unsafe-perm --production
EXPOSE 5432
CMD ["npm", "start"]

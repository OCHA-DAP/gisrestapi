FROM unocha/debian-base:10-buster-202102-01

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /srv/gisapi

COPY . .

RUN apt-get -y update && \
    apt-get -y install curl locales nano gettext-base moreutils && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash -  && \
    apt-get -y update && \
    apt-get -y install nodejs mapnik-utils gdal-bin git && \
    npm install && \
    npm cache clean --force && \
    apt-get -y autoremove && \
    apt-get -y clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    mv docker/entrypoint.sh /srv/ && \
    chmod +x /srv/entrypoint.sh

ENTRYPOINT /srv/entrypoint.sh

EXPOSE 80

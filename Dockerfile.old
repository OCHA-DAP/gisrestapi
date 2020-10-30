FROM phusion/baseimage:0.9.18
# FROM unocha/debian-base:

ENV DEBIAN_FRONTEND=noninteractive \
    CC="clang-3.8" \
    CXX="clang++-3.8"

WORKDIR /srv/gisapi

COPY . .

RUN echo -en "LANGUAGE=en_US.UTF-8\nLC_ALL=en_US.UTF-8\nLC_PAPER=en_US.UTF-8\nLC_ADDRESS=en_US.UTF-8\n" > /etc/default/locale && \
    echo -en "LC_MONETARY=en_US.UTF-8\nLC_NUMERIC=en_US.UTF-8\nLC_TELEPHONE=en_US.UTF-8\nLC_IDENTIFICATION=en_US.UTF-8\n" >> /etc/default/locale && \
    echo -en "LC_MEASUREMENT=en_US.UTF-8\nLC_TIME=en_US.UTF-8\nLC_NAME=en_US.UTF-8\nLANG=en_US.UTF-8" >> /etc/default/locale && \
    locale-gen en_US.UTF-8 && dpkg-reconfigure locales && \
    curl -sL https://deb.nodesource.com/setup_8.x | bash -  && \
    add-apt-repository -y ppa:ubuntu-toolchain-r/test && \
    apt-get -y update && \
    apt-get -y upgrade && \
    apt-get -y dist-upgrade && \
    apt-get -y install \
        build-essential \
        clang-3.8 \
        g++-6 \
        gcc-6 \
        gdal-bin \
        gettext-base \
        git \
        mapnik-utils \
        mc \
        msmtp \
        nano \
        nodejs \
        moreutils \
        postgresql-client \
        python-mapnik \
        python-software-properties \
        software-properties-common \
        telnet && \
    git clone https://github.com/mapnik/mapnik /mapnik --depth 10 && \
    cd /mapnik && \
    git submodule update --init && \
    ./bootstrap.sh && \
    ./configure CUSTOM_CXXFLAGS="-D_GLIBCXX_USE_CXX11_ABI=0" CXX=${CXX} CC=${CC} && \
    make && \
    make install && \
    cd /srv/gisapi && \
    rm -rf /mapnik && \
    npm install -g yarn && \
    npm cache clean --force && \
    yarn install && \
    yarn cache clean && \
    apt-get remove -y \
        build-essential \
        clang-3.8 \
        g++-6 \
        gcc-6 \
        gcc && \
    apt-get -y autoremove && \
    apt-get -y clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm -rf /etc/service/syslog-* && \
    rm -rf /etc/service/cron && \
    rm -rf /etc/service/sshd && \
    mkdir -p /etc/service/gisapi /srv && \
    mv docker/run_gisapi /etc/service/gisapi/run && \
    chmod +x /etc/service/gisapi/run

    # # curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get -qq -y install nodejs && \
    
    # # apt-get -qq -y update && \
    # # apt-get -qq -y upgrade && \
    # # apt-get -qq -y dist-upgrade && \
    # # apt-get install -y gcc-6 g++-6 clang-3.8 && \
    # git clone https://github.com/mapnik/mapnik /mapnik --depth 10 && \
    # cd /mapnik && \
    # git submodule update --init && \
    # # apt-get install -y python zlib1g-dev clang make pkg-config curl && \
    # export CXX="clang++-3.8" && export CC="clang-3.8" && \
    # ./bootstrap.sh && \
    # ./configure CUSTOM_CXXFLAGS="-D_GLIBCXX_USE_CXX11_ABI=0" CXX=${CXX} CC=${CC} && \
    # make && \
    # make test && \
    # make install && \
    # npm install && \
    # npm cache clean && \
    # apt-get remove -y build-essential && \
    # apt-get -y autoremove && \
    # apt-get -y clean && \
    # rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
    # apt-get -qq -y install \

    # # add-apt-repository -y ppa:mapnik/nightly-2.3 && \
    # # apt-get -qq -y update && \
    # # apt-get -qq -y install gdal-bin \
    # #     postgresql-client \
    # #     libmapnik \
    # #     libmapnik-dev \
    # #     mapnik-utils \
    # #     python-mapnik \
    # #     mapnik-input-plugin-gdal && \
    # # apt-get -qq -y install libc-bin && \

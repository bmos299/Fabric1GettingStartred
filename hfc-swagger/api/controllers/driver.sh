#!/bin/bash

jFILE=$1
CWD=$PWD
cd ..
make images
cd $CWD
# create docker-compser.yml
node network.js $jFILE

# create network
docker-compose -f docker-cfg.yml up -d

exit

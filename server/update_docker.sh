docker create -p 443:3001 -v ~/zoppydb${2-1}:/data/db -v ~/session${2-1}:/app/session dantenol/zoppy:${1-latest}
docker stop $(docker ps -aq)
docker start $(docker container ls -lq)

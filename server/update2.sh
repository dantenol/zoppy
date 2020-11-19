v=${1-latest}
docker pull dantenol/zoppy:$v
cd /home/ec2-user/app/
docker-compose down
sed -i "s@~\/@\/home\/ec2-user\/@" docker-compose.yml
if [ $1 ]
then
  sed -i "s@l\/zoppy@l\/zoppy:$1@" docker-compose.yml
fi
docker-compose up -d --build
if [ $1 ]
then
  sed -i "s@l\/zoppy:$1@l\/zoppy@" docker-compose.yml
fi

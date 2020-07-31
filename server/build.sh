v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2+1}1' LATEST)
if [ $# -ne 0 ] && [ $1 = 'same' ]
then
  v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2}1' LATEST)
fi

echo $v
awk -i inplace -v ver=$v '{sub(/v[0-9]{2,3}\.0/,ver".0");}1' package.json

echo Building $v...
npm run update-front
npm run custom-key
docker build -t dantenol/zoppy:$v .
docker push dantenol/zoppy:$v
docker tag dantenol/zoppy:$v dantenol/zoppy:latest
docker push dantenol/zoppy:latest

echo $v > LATEST
echo Done

v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2+1}1' LATEST)
save=0
if [ $# -ne 0 ]
then
  v=$1
fi

echo Building $v...
npm run update-front
npm run custom-key
docker build -t dantenol/zoppy:$v .

echo $v
echo Done

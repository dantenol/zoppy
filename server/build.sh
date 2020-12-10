v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2+1}1' LATEST)
save=0
if [ $# -ne 0 ] && [ $1 = 'same' ]
then
  v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2}1' LATEST)
  awk -i inplace -v ver=$v '{sub(/v[0-9]{2,3}\.0/,ver".0");}1' package.json
  awk -i inplace -v ver=$v '{sub(/v[0-9]{2,3}\.0/,ver".0");}1' ../view/package.json
  save=1
elif [ $# -ne 0 ]
then
  v=$1
else
  awk -i inplace -v ver=$v '{sub(/v[0-9]{2,3}\.0/,ver".0");}1' package.json
  awk -i inplace -v ver=$v '{sub(/v[0-9]{2,3}\.0/,ver".0");}1' ../view/package.json
  save=1
fi

echo $v

echo Building $v...
npm run update-front
npm run custom-key
cp -r ../static/launch ./client
docker build -t dantenol/zoppy:$v .
docker push dantenol/zoppy:$v
docker tag dantenol/zoppy:$v dantenol/zoppy:latest
docker push dantenol/zoppy:latest
git add ./LATEST
git add ./package.json
git add ../view/package.json
git add ./client
git commit -m 'replace version'
git push

if [ $save -eq 1 ]
then
  echo $v > LATEST
fi
echo Done

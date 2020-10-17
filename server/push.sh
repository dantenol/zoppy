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

npm run update-front
# sed -i "s/\"latest\"/\"$v\"/g" "../.github/workflows/version.yml"
echo $v
echo $v > LATEST
# git add ../.github/workflows/s3.yml
git add ./LATEST
git add ./package.json
git add ../view/package.json
git add ./client
# git commit -m 'replace version'
# git push
# sed -i "s/\"$v\"/\"latest\"/g" "../.github/workflows/version.yml"
# git add ../.github/workflows/s3.yml
# git commit -m 'update latest'
git commit -m 'replace version'
git push

gh release create $v
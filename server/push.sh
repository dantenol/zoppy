v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2+1}1' LATEST)

sed -i "s/\"latest\"/\"$v\"/g" "../.github/workflows/s3.yml"
echo $v
git add ../.github/workflows/s3.yml
git commit -m 'replace version'
git push
sed -i "s/\"$v\"/\"latest\"/g" "../.github/workflows/s3.yml"
git add ../.github/workflows/s3.yml
git commit -m 'update latest'
git commit -m 'replace version'
git push
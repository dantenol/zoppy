v=$(awk -F"v" 'BEGIN{OFS=FS} $1==""{$2=$2+1}1' LATEST)

sed -i "s/\"latest\"/$v/g" "../.github/workflows/s3.yml"
echo $v
git add .
git commit -m 'replace version'
git push
sed -i "s/$v/\"latest\"/g" "../.github/workflows/s3.yml"
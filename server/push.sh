sed -i "s/latest/$v/g" "../.github/workflows/s3.yml"
git add .
git commit -m 'replace version'
git push
sed -i "s/$v/latest/g" "../.github/workflows/s3.yml"
cd ~/app
rm -r *
aws s3 cp s3://zoppy-app/${1-latest} . --recursive
docker-compose up -d --build
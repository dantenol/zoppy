echo "#!/bin/bash" > /home/ec2-user/start_docker.sh
echo "" >> /home/ec2-user/start_docker.sh
echo "runuser -l ec2-user -c 'whoami'" >> /home/ec2-user/start_docker.sh
echo "runuser -l ec2-user -c 'cd /home/ec2-user/app && docker-compose down && docker-compose up -d'" >> /home/ec2-user/start_docker.sh
echo "runuser -l ec2-user -c 'date > ~/last_start.txt'" >> /home/ec2-user/start_docker.sh
chmod +x /home/ec2-user/start_docker.sh
cp /home/ec2-user/start_docker.sh /usr/local/bin
chmod +x /usr/local/bin/start_docker.sh

echo "[Unit]" > /etc/systemd/system/zoppy.service
echo "Description=Zoppy system containers" >> /etc/systemd/system/zoppy.service
echo "" >> /etc/systemd/system/zoppy.service
echo "Wants=network.target" >> /etc/systemd/system/zoppy.service
echo "After=syslog.target network-online.target" >> /etc/systemd/system/zoppy.service
echo "" >> /etc/systemd/system/zoppy.service
echo "[Service]" >> /etc/systemd/system/zoppy.service
echo "Type=simple" >> /etc/systemd/system/zoppy.service
echo "ExecStart=/usr/local/bin/start_docker.sh" >> /etc/systemd/system/zoppy.service
echo "Restart=on-failure" >> /etc/systemd/system/zoppy.service
echo "RestartSec=10" >> /etc/systemd/system/zoppy.service
echo "KillMode=process" >> /etc/systemd/system/zoppy.service
echo "" >> /etc/systemd/system/zoppy.service
echo "[Install]" >> /etc/systemd/system/zoppy.service
echo "WantedBy=multi-user.target" >> /etc/systemd/system/zoppy.service

chmod 640 /etc/systemd/system/zoppy.service
systemctl enable zoppy
# systemctl start zoppy

# systemctl status zoppy.service

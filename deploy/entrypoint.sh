#!/bin/bash

# 使用 ifconfig 获取主机的 IP 地址（假设是 eth0 接口）
LOCAL_IP=$(ifconfig eth0 | grep inet | awk '{ print $2 }' | head -n 1)

# 使用 awk 替换 nginx.conf.template 中的环境变量
echo "Replacing LOCAL_IP in nginx.conf"
awk -v ip="$LOCAL_IP" '{gsub(/\${LOCAL_IP}/, ip); print}' /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
bash /etc/nginx/monitor.sh $DET_URL $DST_PATH &
/usr/share/nginx/sbin/nginx -g 'daemon off;'
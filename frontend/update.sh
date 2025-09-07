git pull && npm run build && rsync -a dist/ /var/www/productivity/ && sudo systemctl --user restart dashboard.service && sudo systemctl restart nginx.service

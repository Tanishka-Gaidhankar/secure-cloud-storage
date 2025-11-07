# Use Nginx Alpine image as base (lightweight and fast)
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Create and configure Nginx server block
RUN echo "server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ { \
        expires 30d; \
        access_log off; \
    } \
    \
    location ~ /\.ht { \
        deny all; \
    } \
    \
    error_page 404 /index.html; \
}" > /etc/nginx/conf.d/default.conf

# Copy your application files to Nginx's document root
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
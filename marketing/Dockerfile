# Static marketing site — no build step, no node_modules.
FROM nginx:alpine

# Copy the whole site (the Dockerfile itself is excluded via .dockerignore)
COPY . /usr/share/nginx/html/

EXPOSE 80

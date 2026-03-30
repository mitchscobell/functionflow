FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx \
    && sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf \
    && sed -i '/^user/d' /etc/nginx/nginx.conf \
    && touch /run/nginx.pid && chown nginx:nginx /run/nginx.pid

USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

FROM nginx:stable-alpine
LABEL org.opencontainers.image.source=https://github.com/cmu-delphi/www-forecast
COPY ./site /usr/share/nginx/html/
# ensure files are readable at runtime
RUN chmod o+r -R /usr/share/nginx/html/
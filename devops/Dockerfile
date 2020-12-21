FROM nginx:stable-alpine
COPY ./site /usr/share/nginx/html/
# ensure files are readable at runtime
RUN chmod o+r -R /usr/share/nginx/html/
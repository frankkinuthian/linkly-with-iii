FROM iiidev/iii:latest

WORKDIR /app

COPY config.yaml .
COPY workers/ ./workers/

RUN mkdir -p ./data

EXPOSE 3111 3112 3110 4000 49134

CMD ["iii", "--config", "config.yaml"]

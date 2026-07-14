FROM golang:1.20
WORKDIR /usr/src/app
RUN useradd -m sandboxuser
USER sandboxuser
CMD ["sh", "-c", "GOCACHE=/tmp/go-cache go run sandbox.go"]

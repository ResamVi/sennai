FROM golang:1.15

RUN mkdir /app
ADD . /app/
WORKDIR /app

RUN go build cmd/sennai/sennai_start.go

EXPOSE 7999

CMD ["./sennai_start"]
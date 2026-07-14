#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker build -t sandbox-python:3.10 -f pages/api/code/Dockerfiles/Python/Dockerfile .
docker build -t sandbox-java:17 -f pages/api/code/Dockerfiles/Java/Dockerfile .
docker build -t sandbox-kotlin:2.0 -f pages/api/code/Dockerfiles/Kotlin/Dockerfile .
docker build -t sandbox-node:18 -f pages/api/code/Dockerfiles/JavaScript/Dockerfile .
docker build -t sandbox-c:latest -f pages/api/code/Dockerfiles/C/Dockerfile .
docker build -t sandbox-cpp:latest -f pages/api/code/Dockerfiles/CPP/Dockerfile .
docker build -t sandbox-go:1.20 -f pages/api/code/Dockerfiles/Go/Dockerfile .
docker build -t sandbox-ruby:3.2 -f pages/api/code/Dockerfiles/Ruby/Dockerfile .
docker build -t sandbox-php:8.2 -f pages/api/code/Dockerfiles/PHP/Dockerfile .
docker build -t sandbox-rust:1.73 -f pages/api/code/Dockerfiles/Rust/Dockerfile .
docker build -t sandbox-dart:stable -f pages/api/code/Dockerfiles/Dart/Dockerfile .

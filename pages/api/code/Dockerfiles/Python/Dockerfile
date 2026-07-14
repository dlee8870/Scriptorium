FROM python:3.10-slim
WORKDIR /usr/src/app
RUN useradd -m sandboxuser
USER sandboxuser
CMD ["python3", "sandbox.py"]

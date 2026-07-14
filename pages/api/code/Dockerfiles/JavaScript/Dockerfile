FROM node:18-slim
WORKDIR /usr/src/app
RUN useradd -m sandboxuser
USER sandboxuser
CMD ["node", "sandbox.js"]

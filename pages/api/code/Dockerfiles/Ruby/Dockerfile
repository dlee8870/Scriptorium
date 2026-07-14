FROM ruby:3.2-slim
WORKDIR /usr/src/app
RUN useradd -m sandboxuser
USER sandboxuser
CMD ["ruby", "sandbox.rb"]

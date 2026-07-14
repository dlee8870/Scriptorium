FROM dart:stable

WORKDIR /usr/src/app

# Copy the Dart file into the container
COPY pages/api/code/Dockerfiles/Dart/sandbox.dart .

# Compile and execute the Dart file
CMD ["sh", "-c", "dart sandbox.dart"]


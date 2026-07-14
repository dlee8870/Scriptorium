FROM eclipse-temurin:17-jdk

WORKDIR /usr/src/app

# Compile the conventional Main class into the writable temporary filesystem.
CMD ["sh", "-c", "javac -d /tmp Main.java && java -cp /tmp Main"]

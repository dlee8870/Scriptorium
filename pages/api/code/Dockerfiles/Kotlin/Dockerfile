FROM eclipse-temurin:17-jdk

ARG KOTLIN_VERSION=2.0.21

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip \
    && curl -fsSL "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" -o /tmp/kotlin.zip \
    && unzip /tmp/kotlin.zip -d /opt \
    && rm -rf /var/lib/apt/lists/* /tmp/kotlin.zip

ENV PATH="/opt/kotlinc/bin:${PATH}"
WORKDIR /usr/src/app

CMD ["sh", "-c", "kotlinc Main.kt -include-runtime -d /tmp/main.jar && java -jar /tmp/main.jar"]

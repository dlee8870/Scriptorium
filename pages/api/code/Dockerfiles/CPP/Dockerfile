FROM gcc:latest
WORKDIR /usr/src/app

# Copy the C++ file into the container's working directory
COPY pages/api/code/Dockerfiles/CPP/sandbox.cpp .

# Allow root user to write to the directory
RUN chmod -R 777 /usr/src/app

# Compile and run the C++ code
CMD ["sh", "-c", "g++ sandbox.cpp -o /tmp/sandbox && /tmp/sandbox"]


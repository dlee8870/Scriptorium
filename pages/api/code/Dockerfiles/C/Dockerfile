FROM gcc:latest
WORKDIR /usr/src/app

# Copy the sandbox.cpp file into the container's working directory
COPY pages/api/code/Dockerfiles/C/sandbox.c .

# Allow root user to write to the directory
RUN chmod -R 777 /usr/src/app

# Compile and run the C code as root
CMD ["sh", "-c", "gcc sandbox.c -o /tmp/sandbox && /tmp/sandbox"]






FROM rust:1.73

WORKDIR /usr/src/app

# Allow write permissions for the Rust compiler
RUN chmod -R 777 /usr/src/app

# Copy the Rust file into the container's working directory
COPY pages/api/code/Dockerfiles/Rust/sandbox.rs .

# Command to compile and execute the Rust code
CMD ["sh", "-c", "rustc sandbox.rs -o /tmp/sandbox && /tmp/sandbox"]

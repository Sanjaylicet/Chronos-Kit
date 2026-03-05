# OrganaTrack

A Spring Boot application with state machine functionality for organizational tracking and workflow management.

## Features

- **Java 21 LTS**: Latest long-term support version
- **Spring Boot 3.3.7**: Latest stable Spring Boot version
- **Hiero State Machine**: Custom Spring Boot starter for annotation-driven state management
- **Code Quality**: Spotless plugin for strict code formatting

## Projects

### Main Application (`demo`)
Spring Boot application with REST API capabilities.

### Hiero State Machine Starter (`hiero-state-machine-spring-boot-starter`)
A custom Spring Boot starter providing annotation-driven state machine functionality.

For detailed documentation, see [hiero-state-machine-spring-boot-starter/README.md](hiero-state-machine-spring-boot-starter/README.md)

## Build and Run

```bash
# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

## Code Formatting

This project uses Spotless for code formatting enforcement.

### Check formatting

```bash
mvn spotless:check
```

### Apply formatting

```bash
mvn spotless:apply
```

### Features

- **Google Java Format**: Enforces Google code style
- **Import organization**: Orders imports (java, javax, org, com)
- **Removes unused imports**
- **Trim trailing whitespace**
- **Ensures files end with newline**
- **License header**: Adds copyright header to Java files

Spotless check runs automatically during the `validate` phase of the Maven build lifecycle.

## Requirements

- Java 21+
- Maven 3.9+

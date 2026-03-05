# Spring Boot Project with Spotless

This is a Spring Boot project configured with Maven and the Spotless plugin for strict code formatting.

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
- Java 17+
- Maven 3.6+

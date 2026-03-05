# Hiero State Machine Spring Boot Starter

A Spring Boot starter library that provides annotation-driven state machine functionality for Hedera/Hiero applications.

## Features

- 🎯 **Annotation-driven**: Use `@HieroStateTransition` to define state transitions
- ⚡ **Auto-configuration**: Automatic setup with Spring Boot
- 🔧 **Configurable**: Customize behavior via application properties
- 🧪 **Tested**: Comprehensive unit tests included

## Installation

Add the dependency to your `pom.xml`:

```xml
<dependency>
  <groupId>com.hedera</groupId>
  <artifactId>hiero-state-machine-spring-boot-starter</artifactId>
  <version>0.0.1-SNAPSHOT</version>
</dependency>
```

## Quick Start

### 1. Define a State Transition Handler

```java
@Component
public class OrderStateMachine {

    @HieroStateTransition(
        from = "PENDING",
        to = "CONFIRMED",
        event = "APPROVE",
        description = "Approve pending order"
    )
    public void approveOrder(OrderContext context) {
        // Your transition logic here
        System.out.println("Order approved: " + context.getOrderId());
    }

    @HieroStateTransition(
        from = "CONFIRMED",
        to = "SHIPPED",
        event = "SHIP"
    )
    public void shipOrder(OrderContext context) {
        // Your shipping logic here
        System.out.println("Order shipped: " + context.getOrderId());
    }
}
```

### 2. Configure Properties (Optional)

In `application.properties` or `application.yml`:

```properties
# Enable/disable state machine
hiero.state-machine.enabled=true

# Enforce strict validation
hiero.state-machine.strict-mode=true

# Log all transitions
hiero.state-machine.log-transitions=true

# Max concurrent transitions
hiero.state-machine.max-concurrent-transitions=100
```

## Annotation Reference

### `@HieroStateTransition`

Marks a method as a state transition handler.

**Attributes:**

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | String | Yes | - | Source state |
| `to` | String | Yes | - | Target state |
| `event` | String | Yes | - | Triggering event |
| `description` | String | No | `""` | Transition description |
| `priority` | int | No | `0` | Handler priority (higher = earlier execution) |

## Configuration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hiero.state-machine.enabled` | boolean | `true` | Enable/disable state machine |
| `hiero.state-machine.strict-mode` | boolean | `true` | Enforce strict validation |
| `hiero.state-machine.log-transitions` | boolean | `false` | Log all transitions |
| `hiero.state-machine.max-concurrent-transitions` | int | `100` | Max concurrent transitions |

## Building

```bash
mvn clean install
```

## Testing

```bash
mvn test
```

## Requirements

- Java 21+
- Spring Boot 3.3.7+

## License

Copyright (C) 2026

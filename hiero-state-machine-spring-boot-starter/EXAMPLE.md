# Example: Order Processing State Machine

This example demonstrates how to use the Hiero State Machine Spring Boot Starter to model an order processing workflow.

## State Diagram

```
PENDING ──[APPROVE]──> CONFIRMED ──[SHIP]──> SHIPPED ──[DELIVER]──> DELIVERED
   │                       │
   └───[CANCEL]──> CANCELLED <──[CANCEL]───┘
```

## State Definitions

| State | Description |
|-------|-------------|
| `PENDING` | Order created, awaiting approval |
| `CONFIRMED` | Order approved and payment confirmed |
| `SHIPPED` | Order dispatched for delivery |
| `DELIVERED` | Order successfully delivered |
| `CANCELLED` | Order cancelled (can happen from PENDING or CONFIRMED) |

## Transitions

| From | To | Event | Priority | Handler Method |
|------|----|----|----------|----------------|
| PENDING | CONFIRMED | APPROVE | 10 | `confirmOrder()` |
| CONFIRMED | SHIPPED | SHIP | 0 | `shipOrder()` |
| SHIPPED | DELIVERED | DELIVER | 0 | `deliverOrder()` |
| PENDING | CANCELLED | CANCEL | 5 | `cancelPendingOrder()` |
| CONFIRMED | CANCELLED | CANCEL | 0 | `cancelConfirmedOrder()` |

## Usage

### 1. Include the Starter

```xml
<dependency>
  <groupId>com.hedera</groupId>
  <artifactId>hiero-state-machine-spring-boot-starter</artifactId>
  <version>0.0.1-SNAPSHOT</version>
</dependency>
```

### 2. Define Your State Machine

```java
@Component
public class OrderStateMachine {

    @HieroStateTransition(
        from = "PENDING",
        to = "CONFIRMED",
        event = "APPROVE",
        description = "Approve and confirm a pending order",
        priority = 10
    )
    public void confirmOrder(OrderContext context) {
        // Your business logic here
    }
}
```

### 3. Configure Properties (Optional)

```properties
hiero.state-machine.enabled=true
hiero.state-machine.strict-mode=true
hiero.state-machine.log-transitions=true
```

### 4. Run Your Application

The state machine will automatically:
- Scan for `@HieroStateTransition` annotated methods
- Register transition handlers
- Log transitions (if enabled)
- Enforce validation (if strict mode enabled)

## Advanced Features

### Priority Handling

When multiple handlers exist for the same transition, they execute in priority order (higher first):

```java
@HieroStateTransition(from = "PENDING", to = "CANCELLED", event = "CANCEL", priority = 10)
public void validateCancellation(OrderContext context) {
    // Runs first (priority 10)
}

@HieroStateTransition(from = "PENDING", to = "CANCELLED", event = "CANCEL", priority = 5)
public void processCancellation(OrderContext context) {
    // Runs second (priority 5)
}
```

### Context Object

Pass data between transitions using a context object:

```java
public class OrderContext {
    private String orderId;
    private String customerId;
    private double amount;
    // getters and setters
}
```

## Testing

Run the included tests:

```bash
cd hiero-state-machine-spring-boot-starter
mvn test
```

## See Also

- [Main README](../README.md)
- [API Documentation](../README.md#annotation-reference)

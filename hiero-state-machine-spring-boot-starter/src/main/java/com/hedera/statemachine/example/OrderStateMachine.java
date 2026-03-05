/* Copyright (C) 2026 */
package com.hedera.statemachine.example;

import com.hedera.statemachine.annotation.HieroStateTransition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Example state machine for order processing workflow.
 *
 * <p>This demonstrates how to use {@link HieroStateTransition} annotation to define state
 * transitions in a Spring component.
 *
 * <p>Order States: PENDING → CONFIRMED → SHIPPED → DELIVERED
 */
@Component
public class OrderStateMachine {

  private static final Logger logger = LoggerFactory.getLogger(OrderStateMachine.class);

  @HieroStateTransition(
      from = "PENDING",
      to = "CONFIRMED",
      event = "APPROVE",
      description = "Approve and confirm a pending order",
      priority = 10)
  public void confirmOrder(OrderContext context) {
    logger.info(
        "Confirming order {} for customer {} (amount: ${})",
        context.getOrderId(),
        context.getCustomerId(),
        context.getAmount());

    // Business logic for order confirmation
    // - Validate payment
    // - Reserve inventory
    // - Send confirmation email
  }

  @HieroStateTransition(
      from = "CONFIRMED",
      to = "SHIPPED",
      event = "SHIP",
      description = "Ship confirmed order")
  public void shipOrder(OrderContext context) {
    logger.info("Shipping order {} to customer {}", context.getOrderId(), context.getCustomerId());

    // Business logic for shipping
    // - Generate shipping label
    // - Update tracking information
    // - Send shipment notification
  }

  @HieroStateTransition(
      from = "SHIPPED",
      to = "DELIVERED",
      event = "DELIVER",
      description = "Mark order as delivered")
  public void deliverOrder(OrderContext context) {
    logger.info("Order {} delivered to customer {}", context.getOrderId(), context.getCustomerId());

    // Business logic for delivery
    // - Update delivery status
    // - Send delivery confirmation
    // - Request customer feedback
  }

  @HieroStateTransition(
      from = "PENDING",
      to = "CANCELLED",
      event = "CANCEL",
      description = "Cancel pending order",
      priority = 5)
  public void cancelPendingOrder(OrderContext context) {
    logger.info("Cancelling pending order {}", context.getOrderId());

    // Business logic for cancellation
    // - Release reserved inventory
    // - Process refund
    // - Send cancellation notification
  }

  @HieroStateTransition(
      from = "CONFIRMED",
      to = "CANCELLED",
      event = "CANCEL",
      description = "Cancel confirmed order")
  public void cancelConfirmedOrder(OrderContext context) {
    logger.info("Cancelling confirmed order {}", context.getOrderId());

    // Business logic for cancellation
    // - Release inventory
    // - Process refund with fee
    // - Send cancellation notification
  }
}

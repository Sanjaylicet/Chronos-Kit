/* Copyright (C) 2026 */
package com.hedera.statemachine.example;

/**
 * Example context object for state transitions.
 *
 * <p>This represents the data that flows through state transitions.
 */
public class OrderContext {

  private String orderId;
  private String customerId;
  private double amount;

  public OrderContext(String orderId, String customerId, double amount) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.amount = amount;
  }

  public String getOrderId() {
    return orderId;
  }

  public void setOrderId(String orderId) {
    this.orderId = orderId;
  }

  public String getCustomerId() {
    return customerId;
  }

  public void setCustomerId(String customerId) {
    this.customerId = customerId;
  }

  public double getAmount() {
    return amount;
  }

  public void setAmount(double amount) {
    this.amount = amount;
  }
}

/* Copyright (C) 2026 */
package com.hedera.statemachine.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that handle state transitions in the Hiero state machine.
 *
 * <p>Methods annotated with {@code @HieroStateTransition} will be automatically registered as
 * state transition handlers and invoked when the corresponding state transition occurs.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * @HieroStateTransition(from = "PENDING", to = "COMPLETED", event = "APPROVE")
 * public void handleApproval(StateContext context) {
 *     // Transition logic here
 * }
 * }</pre>
 *
 * @since 0.0.1
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface HieroStateTransition {

  /**
   * The source state from which the transition originates.
   *
   * @return the source state name
   */
  String from();

  /**
   * The target state to which the transition leads.
   *
   * @return the target state name
   */
  String to();

  /**
   * The event that triggers this state transition.
   *
   * @return the event name
   */
  String event();

  /**
   * Optional description of the state transition.
   *
   * @return the description, defaults to empty string
   */
  String description() default "";

  /**
   * Optional priority for transition handlers when multiple handlers exist for the same transition.
   * Higher values indicate higher priority.
   *
   * @return the priority value, defaults to 0
   */
  int priority() default 0;
}

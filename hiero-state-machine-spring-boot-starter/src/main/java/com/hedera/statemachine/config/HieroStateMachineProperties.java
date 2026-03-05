/* Copyright (C) 2026 */
package com.hedera.statemachine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Hiero State Machine.
 *
 * <p>Prefix: {@code hiero.state-machine}
 *
 * <p>Example configuration in application.properties:
 *
 * <pre>
 * hiero.state-machine.enabled=true
 * hiero.state-machine.strict-mode=true
 * hiero.state-machine.log-transitions=true
 * </pre>
 *
 * @since 0.0.1
 */
@ConfigurationProperties(prefix = "hiero.state-machine")
public class HieroStateMachineProperties {

  /** Whether the state machine is enabled. Defaults to true. */
  private boolean enabled = true;

  /**
   * Whether to enforce strict state transition validation. When enabled, invalid transitions will
   * throw exceptions. Defaults to true.
   */
  private boolean strictMode = true;

  /** Whether to log state transitions. Defaults to false. */
  private boolean logTransitions = false;

  /**
   * Maximum number of concurrent state transitions allowed. Defaults to 100.
   */
  private int maxConcurrentTransitions = 100;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean isStrictMode() {
    return strictMode;
  }

  public void setStrictMode(boolean strictMode) {
    this.strictMode = strictMode;
  }

  public boolean isLogTransitions() {
    return logTransitions;
  }

  public void setLogTransitions(boolean logTransitions) {
    this.logTransitions = logTransitions;
  }

  public int getMaxConcurrentTransitions() {
    return maxConcurrentTransitions;
  }

  public void setMaxConcurrentTransitions(int maxConcurrentTransitions) {
    this.maxConcurrentTransitions = maxConcurrentTransitions;
  }
}

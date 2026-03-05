/* Copyright (C) 2026 */
package com.hedera.statemachine.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * Auto-configuration for Hiero State Machine.
 *
 * <p>This configuration is automatically loaded when the starter is on the classpath and enables
 * state machine functionality with sensible defaults.
 *
 * @since 0.0.1
 */
@AutoConfiguration
@EnableConfigurationProperties(HieroStateMachineProperties.class)
public class HieroStateMachineAutoConfiguration {

  private static final Logger logger =
      LoggerFactory.getLogger(HieroStateMachineAutoConfiguration.class);

  /**
   * Creates the state transition processor bean.
   *
   * @param properties the configuration properties
   * @return the state transition processor
   */
  @Bean
  @ConditionalOnMissingBean
  public StateTransitionProcessor stateTransitionProcessor(
      HieroStateMachineProperties properties) {
    logger.info("Initializing Hiero State Machine with enabled={}", properties.isEnabled());
    return new StateTransitionProcessor(properties);
  }
}

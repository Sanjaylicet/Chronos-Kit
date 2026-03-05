/* Copyright (C) 2026 */
package com.hedera.statemachine.config;

import com.hedera.statemachine.annotation.HieroStateTransition;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.util.ReflectionUtils;

/**
 * Bean post processor that scans for methods annotated with {@link HieroStateTransition} and
 * registers them as state transition handlers.
 *
 * @since 0.0.1
 */
public class StateTransitionProcessor implements BeanPostProcessor {

  private static final Logger logger = LoggerFactory.getLogger(StateTransitionProcessor.class);

  private final HieroStateMachineProperties properties;
  private final Map<String, List<TransitionHandler>> transitionHandlers = new HashMap<>();

  public StateTransitionProcessor(HieroStateMachineProperties properties) {
    this.properties = properties;
  }

  @Override
  public Object postProcessAfterInitialization(Object bean, String beanName)
      throws BeansException {
    if (!properties.isEnabled()) {
      return bean;
    }

    Class<?> targetClass = bean.getClass();
    ReflectionUtils.doWithMethods(
        targetClass,
        method -> registerTransitionHandler(bean, method),
        method -> AnnotationUtils.findAnnotation(method, HieroStateTransition.class) != null);

    return bean;
  }

  private void registerTransitionHandler(Object bean, Method method) {
    HieroStateTransition annotation =
        AnnotationUtils.findAnnotation(method, HieroStateTransition.class);
    if (annotation == null) {
      return;
    }

    String transitionKey = buildTransitionKey(annotation.from(), annotation.to(), annotation.event());
    TransitionHandler handler = new TransitionHandler(bean, method, annotation);

    transitionHandlers.computeIfAbsent(transitionKey, k -> new ArrayList<>()).add(handler);

    if (properties.isLogTransitions()) {
      logger.info(
          "Registered state transition handler: {} -> {} on event '{}' (priority: {}, method: {})",
          annotation.from(),
          annotation.to(),
          annotation.event(),
          annotation.priority(),
          method.getName());
    }
  }

  private String buildTransitionKey(String from, String to, String event) {
    return String.format("%s|%s|%s", from, to, event);
  }

  /**
   * Retrieves all registered transition handlers.
   *
   * @return map of transition keys to their handlers
   */
  public Map<String, List<TransitionHandler>> getTransitionHandlers() {
    return new HashMap<>(transitionHandlers);
  }

  /** Internal class representing a registered transition handler. */
  public static class TransitionHandler {
    private final Object bean;
    private final Method method;
    private final HieroStateTransition annotation;

    public TransitionHandler(Object bean, Method method, HieroStateTransition annotation) {
      this.bean = bean;
      this.method = method;
      this.annotation = annotation;
      method.setAccessible(true);
    }

    public Object getBean() {
      return bean;
    }

    public Method getMethod() {
      return method;
    }

    public HieroStateTransition getAnnotation() {
      return annotation;
    }
  }
}

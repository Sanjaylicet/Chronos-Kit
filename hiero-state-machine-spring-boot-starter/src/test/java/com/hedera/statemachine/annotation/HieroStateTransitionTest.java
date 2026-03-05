/* Copyright (C) 2026 */
package com.hedera.statemachine.annotation;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

class HieroStateTransitionTest {

  @Test
  void annotationShouldBePresent() throws NoSuchMethodException {
    Method method = TestClass.class.getMethod("testTransition");
    HieroStateTransition annotation = method.getAnnotation(HieroStateTransition.class);

    assertThat(annotation).isNotNull();
    assertThat(annotation.from()).isEqualTo("PENDING");
    assertThat(annotation.to()).isEqualTo("COMPLETED");
    assertThat(annotation.event()).isEqualTo("APPROVE");
    assertThat(annotation.description()).isEqualTo("Test transition");
    assertThat(annotation.priority()).isEqualTo(10);
  }

  @Test
  void annotationShouldHaveDefaults() throws NoSuchMethodException {
    Method method = TestClass.class.getMethod("testTransitionWithDefaults");
    HieroStateTransition annotation = method.getAnnotation(HieroStateTransition.class);

    assertThat(annotation).isNotNull();
    assertThat(annotation.description()).isEmpty();
    assertThat(annotation.priority()).isZero();
  }

  static class TestClass {
    @HieroStateTransition(
        from = "PENDING",
        to = "COMPLETED",
        event = "APPROVE",
        description = "Test transition",
        priority = 10)
    public void testTransition() {}

    @HieroStateTransition(from = "START", to = "END", event = "FINISH")
    public void testTransitionWithDefaults() {}
  }
}

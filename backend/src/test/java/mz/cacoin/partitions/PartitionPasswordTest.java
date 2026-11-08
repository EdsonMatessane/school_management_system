package mz.cacoin.partitions;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PartitionPasswordTest {
  @Test
  void onlyTheConfiguredPasswordIsAccepted() {
    PartitionPassword password = new PartitionPassword("segredo-123");

    assertTrue(password.matches("segredo-123"));
    assertFalse(password.matches("segredo-124"));
    assertFalse(password.matches("segredo-123 "));
    assertFalse(password.matches(""));
    assertFalse(password.matches(null));
  }

  @Test
  void fallsBackToTheDefaultWhenNothingIsConfigured() {
    assertTrue(new PartitionPassword("").matches(PartitionPassword.DEFAULT));
    assertTrue(new PartitionPassword(null).matches(PartitionPassword.DEFAULT));
    assertFalse(new PartitionPassword("").matches("outra"));
  }
}

package mz.cacoin.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class NibTest {
  private static final String NIB = "000800011234567890155";

  @Test
  void aValidNibHas21DigitsAndAcceptsSeparators() {
    assertTrue(Nib.isValid(NIB));
    assertTrue(Nib.isValid("0008 0001 1234 5678 9015 5"));
    assertEquals(NIB, Nib.clean("0008-0001 1234 5678 9015 5"));
  }

  @Test
  void theAccountIsTheElevenDigitsAfterBankAndBranch() {
    assertEquals("12345678901", Nib.account(NIB));
    assertEquals("12345678901", Nib.account("0008 0001 1234 5678 9015 5"));
  }

  @Test
  void rejectsWrongLengthsAndEmptyValues() {
    assertFalse(Nib.isValid(null));
    assertFalse(Nib.isValid(""));
    assertFalse(Nib.isValid(NIB.substring(1)));
    assertFalse(Nib.isValid(NIB + "0"));
    assertNull(Nib.account("123"));
    assertEquals("O NIB deve ter exactamente 21 dígitos", Nib.validate("123"));
  }

  @Test
  void rejectsAnEmptyBankCodeOrAnAccountOfZeros() {
    assertFalse(Nib.isValid("000012345678901234567"));
    assertFalse(Nib.isValid("000800010000000000055"));
  }
}

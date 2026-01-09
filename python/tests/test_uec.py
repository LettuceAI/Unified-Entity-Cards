import unittest

from uec import (
  assert_uec,
  create_character_uec,
  create_persona_uec,
  is_uec,
  validate_uec,
)


class TestUEC(unittest.TestCase):
  def test_minimal_character_non_strict(self) -> None:
    card = create_character_uec({"id": "char-1", "name": "Aster Vale"})
    result = validate_uec(card)
    self.assertTrue(result.ok)
    self.assertEqual(result.errors, [])
    self.assertTrue(is_uec(card))

  def test_strict_requires_fields(self) -> None:
    card = create_character_uec({"id": "char-2", "name": "Aster Vale"})
    result = validate_uec(card, strict=True)
    self.assertFalse(result.ok)
    self.assertGreater(len(result.errors), 0)

  def test_app_specific_settings_must_be_object(self) -> None:
    card = create_persona_uec(
      {"id": "per-1", "title": "Pragmatic Analyst"},
      app_specific_settings="nope",
    )
    result = validate_uec(card)
    self.assertFalse(result.ok)
    self.assertTrue(any("app_specific_settings" in err for err in result.errors))

  def test_assert_uec_raises(self) -> None:
    card = {
      "schema": {"name": "UEC", "version": "1.0"},
      "kind": "persona",
      "payload": {"id": "per-2"},
    }
    with self.assertRaises(ValueError):
      assert_uec(card)


if __name__ == "__main__":
  unittest.main()

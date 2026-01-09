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

    def test_system_prompt_is_id_prefixes(self) -> None:
        card = create_character_uec(
            {"id": "char-3", "name": "Aster Vale", "systemPrompt": "template-1"},
            system_prompt_is_id=True,
        )
        self.assertEqual(card["payload"]["systemPrompt"], "_ID:template-1")

    def test_scene_variants_validation(self) -> None:
        card = create_character_uec(
            {
                "id": "char-4",
                "name": "Aster Vale",
                "scenes": [
                    {
                        "id": "scene-1",
                        "content": "You step into the Archive of Echoes.",
                        "variants": [
                            {
                                "id": "variant-1",
                                "content": "You step into the Archive, where every echo is logged.",
                                "createdAt": 1715100001,
                            }
                        ],
                    }
                ],
            }
        )
        result = validate_uec(card)
        self.assertTrue(result.ok)

        invalid = create_character_uec(
            {
                "id": "char-5",
                "name": "Aster Vale",
                "scenes": [
                    {
                        "id": "scene-2",
                        "content": "You step into the Archive of Echoes.",
                        "variants": [{"content": "Missing id and createdAt"}],
                    }
                ],
            }
        )
        invalid_result = validate_uec(invalid)
        self.assertFalse(invalid_result.ok)
        self.assertTrue(any("variants[0].id" in err for err in invalid_result.errors))


if __name__ == "__main__":
    unittest.main()

import unittest

from textkit import truncate


class TestTruncate(unittest.TestCase):
    def test_short_string_unchanged(self):
        self.assertEqual(truncate("hi", 10), "hi")

    def test_string_at_limit_unchanged(self):
        self.assertEqual(truncate("hello", 5), "hello")

    def test_truncates_long_string(self):
        self.assertEqual(truncate("hello world", 8), "hello w\u2026")


if __name__ == "__main__":
    unittest.main()

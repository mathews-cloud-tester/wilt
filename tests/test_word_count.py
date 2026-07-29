import unittest

from textkit import word_count


class TestWordCount(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(word_count("the quick brown fox"), 4)

    def test_empty(self):
        self.assertEqual(word_count(""), 0)

    def test_extra_whitespace(self):
        self.assertEqual(word_count("  a \t b\nc  "), 3)


if __name__ == "__main__":
    unittest.main()

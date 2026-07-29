import unittest

from textkit import slugify


class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Hello, World!"), "hello-world")

    def test_accents(self):
        self.assertEqual(slugify("Crème Brûlée"), "creme-brulee")

    def test_collapses_separators(self):
        self.assertEqual(slugify("a  --  b"), "a-b")


if __name__ == "__main__":
    unittest.main()

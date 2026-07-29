import unittest

from textkit.emoji import strip_emoji


class TestStripEmoji(unittest.TestCase):
    def test_strips_wave(self):
        self.assertEqual(strip_emoji("hi \U0001F44B"), "hi ")


if __name__ == "__main__":
    unittest.main()

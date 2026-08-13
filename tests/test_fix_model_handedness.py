import copy
import unittest

from scripts.fix_model_handedness import (
    CONVERSION_NODE_NAME,
    apply_handedness_conversion,
)


class HandednessConversionTests(unittest.TestCase):
    def test_wraps_all_scene_roots_in_x_reflection(self):
        document = {
            "scenes": [{"nodes": [1, 4]}],
            "nodes": [
                {"name": "unused"},
                {"name": "mesh-a", "mesh": 0},
                {"name": "unused-2"},
                {"name": "unused-3"},
                {"name": "mesh-b", "mesh": 1},
            ],
        }

        changed = apply_handedness_conversion(document)

        self.assertTrue(changed)
        self.assertEqual(document["scenes"][0]["nodes"], [5])
        self.assertEqual(
            document["nodes"][5],
            {
                "name": CONVERSION_NODE_NAME,
                "scale": [-1.0, 1.0, 1.0],
                "children": [1, 4],
                "extras": {"sourceCoordinateSystem": "LithTech DirectX left-handed"},
            },
        )

    def test_conversion_is_idempotent(self):
        document = {"scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}]}
        apply_handedness_conversion(document)
        once = copy.deepcopy(document)

        changed = apply_handedness_conversion(document)

        self.assertFalse(changed)
        self.assertEqual(document, once)

    def test_merges_new_roots_into_existing_conversion_node(self):
        document = {
            "scenes": [{"nodes": [1, 2]}],
            "nodes": [
                {"mesh": 0},
                {
                    "name": CONVERSION_NODE_NAME,
                    "scale": [-1.0, 1.0, 1.0],
                    "children": [0],
                    "extras": {"sourceCoordinateSystem": "LithTech DirectX left-handed"},
                },
                {"mesh": 1},
            ],
        }

        changed = apply_handedness_conversion(document)

        self.assertTrue(changed)
        self.assertEqual(document["scenes"][0]["nodes"], [1])
        self.assertEqual(document["nodes"][1]["children"], [0, 2])
        self.assertEqual(len(document["nodes"]), 3)

    def test_wraps_each_scene_without_reparenting_shared_nodes(self):
        document = {
            "scenes": [{"nodes": [0]}, {"nodes": [0, 1]}],
            "nodes": [{"mesh": 0}, {"mesh": 1}],
        }

        apply_handedness_conversion(document)

        self.assertEqual(document["scenes"][0]["nodes"], [2])
        self.assertEqual(document["scenes"][1]["nodes"], [3])
        self.assertEqual(document["nodes"][2]["children"], [0])
        self.assertEqual(document["nodes"][3]["children"], [0, 1])


if __name__ == "__main__":
    unittest.main()

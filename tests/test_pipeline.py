"""
Unit and Integration Tests for SentinelGraph Pipeline
=====================================================
Tests:
- Configuration and constants
- MITRE ATT&CK mapping
- Data loading and cleaning
- Feature normalization and IP-to-Node mapping
- Graph snapshot generation and properties
- Event stream conversion for TGN
- Flat features extraction for baselines
"""

import unittest
import numpy as np
import pandas as pd
from pathlib import Path

from config import (
    RAW_LABEL_TO_CATEGORY,
    CATEGORY_TO_ID,
    ID_TO_CATEGORY,
    CATEGORY_TO_MITRE,
    MITRE_STAGE_COLORS,
    MITRE_STAGE_RISK,
    EDGE_FEATURE_COLS,
    COL_TIMESTAMP,
    COL_SRC_IP,
    COL_DST_IP,
)
from src.mitre_mapping import (
    get_mitre_stage,
    get_mitre_color,
    get_risk_score,
    get_stage_from_label_id,
)
from src.data_loader import generate_synthetic_csv, load_and_clean, sample_balanced
from src.graph_builder import (
    IPNodeMapper,
    FeatureNormalizer,
    build_graph_snapshots,
    snapshots_to_event_stream,
    snapshots_to_flat_features,
    snapshot_to_networkx,
)


class TestConfigAndMitre(unittest.TestCase):
    def test_category_mappings(self):
        self.assertEqual(len(CATEGORY_TO_ID), 7)
        self.assertEqual(CATEGORY_TO_ID["Benign"], 0)
        for cat, cid in CATEGORY_TO_ID.items():
            self.assertEqual(ID_TO_CATEGORY[cid], cat)

    def test_mitre_stage_mapping(self):
        # Verify DoS and DDoS map to Impact per requirement
        self.assertEqual(get_mitre_stage("DoS"), "Impact")
        self.assertEqual(get_mitre_stage("DDoS"), "Impact")
        self.assertEqual(get_mitre_stage("BruteForce"), "Initial Access")
        self.assertEqual(get_mitre_stage("Bot"), "Command & Control")
        self.assertEqual(get_mitre_stage("Infiltration"), "Lateral Movement")
        self.assertEqual(get_mitre_stage("Benign"), "Benign")

    def test_mitre_colors_and_risks(self):
        for stage in ["Benign", "Initial Access", "Impact", "Command & Control", "Lateral Movement"]:
            self.assertIn(stage, MITRE_STAGE_COLORS)
            self.assertTrue(MITRE_STAGE_COLORS[stage].startswith("#"))
            self.assertIn(stage, MITRE_STAGE_RISK)
            self.assertGreaterEqual(MITRE_STAGE_RISK[stage], 0.0)
            self.assertLessEqual(MITRE_STAGE_RISK[stage], 1.0)


class TestDataLoader(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_csv = Path("data/raw/test_sample.csv")
        generate_synthetic_csv(cls.test_csv, n_rows=2000)

    @classmethod
    def tearDownClass(cls):
        if cls.test_csv.exists():
            cls.test_csv.unlink()

    def test_load_and_clean(self):
        df = load_and_clean(self.test_csv, max_rows=1000)
        self.assertEqual(len(df), 1000)
        self.assertIn(COL_TIMESTAMP, df.columns)
        self.assertIn(COL_SRC_IP, df.columns)
        self.assertIn(COL_DST_IP, df.columns)
        self.assertIn("label_category", df.columns)
        self.assertIn("label_id", df.columns)

        # Check no infinite or NaN values in feature columns
        for col in EDGE_FEATURE_COLS:
            self.assertFalse(np.isinf(df[col]).any())
            self.assertFalse(df[col].isna().any())

        # Check temporal order
        self.assertTrue(df[COL_TIMESTAMP].is_monotonic_increasing)

    def test_sample_balanced(self):
        df = load_and_clean(self.test_csv)
        sampled = sample_balanced(df, n_per_class=50)
        self.assertLessEqual(len(sampled), len(df))
        self.assertTrue(sampled[COL_TIMESTAMP].is_monotonic_increasing)


class TestGraphBuilder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_csv = Path("data/raw/test_sample_graph.csv")
        generate_synthetic_csv(cls.test_csv, n_rows=3000)
        cls.df = load_and_clean(cls.test_csv)

    @classmethod
    def tearDownClass(cls):
        if cls.test_csv.exists():
            cls.test_csv.unlink()

    def test_ip_node_mapper(self):
        mapper = IPNodeMapper()
        id1 = mapper.get_or_create("192.168.1.1")
        id2 = mapper.get_or_create("192.168.1.2")
        id1_again = mapper.get_or_create("192.168.1.1")
        self.assertEqual(id1, id1_again)
        self.assertNotEqual(id1, id2)
        self.assertEqual(mapper.get_ip(id1), "192.168.1.1")
        self.assertEqual(mapper.num_nodes, 2)

    def test_feature_normalizer(self):
        norm = FeatureNormalizer()
        norm.fit(self.df, EDGE_FEATURE_COLS)
        raw_vals = self.df[EDGE_FEATURE_COLS].values
        norm_vals = norm.transform(raw_vals)
        self.assertGreaterEqual(norm_vals.min(), 0.0)
        self.assertLessEqual(norm_vals.max(), 1.0)

    def test_build_graph_snapshots(self):
        snapshots, mapper, normalizer = build_graph_snapshots(
            self.df, window_size_sec=60, min_edges=2
        )
        self.assertGreater(len(snapshots), 0)

        for snap in snapshots:
            self.assertEqual(snap.edge_index.shape[0], 2)
            self.assertEqual(snap.edge_features.shape[0], snap.num_edges)
            self.assertEqual(snap.edge_features.shape[1], len(EDGE_FEATURE_COLS))
            self.assertEqual(snap.edge_labels.shape[0], snap.num_edges)
            self.assertEqual(snap.edge_timestamps.shape[0], snap.num_edges)

    def test_event_stream_conversion(self):
        snapshots, mapper, normalizer = build_graph_snapshots(
            self.df, window_size_sec=60
        )
        event_stream = snapshots_to_event_stream(snapshots)

        self.assertIn("src", event_stream)
        self.assertIn("dst", event_stream)
        self.assertIn("timestamps", event_stream)
        self.assertIn("edge_features", event_stream)
        self.assertIn("labels", event_stream)

        n = len(event_stream["src"])
        self.assertEqual(len(event_stream["dst"]), n)
        self.assertEqual(len(event_stream["timestamps"]), n)
        self.assertEqual(len(event_stream["edge_features"]), n)
        self.assertEqual(len(event_stream["labels"]), n)

        # Monotonic timestamps check
        ts = event_stream["timestamps"]
        self.assertTrue(np.all(np.diff(ts) >= 0))

    def test_flat_features_conversion(self):
        snapshots, mapper, normalizer = build_graph_snapshots(
            self.df, window_size_sec=60
        )
        X, y = snapshots_to_flat_features(snapshots)
        self.assertEqual(X.shape[0], len(y))
        self.assertEqual(X.shape[1], len(EDGE_FEATURE_COLS))

    def test_networkx_conversion(self):
        snapshots, mapper, normalizer = build_graph_snapshots(
            self.df, window_size_sec=60
        )
        snap = snapshots[0]
        G = snapshot_to_networkx(snap, mapper)
        self.assertTrue(G.is_directed())
        self.assertEqual(G.number_of_nodes(), snap.num_nodes)


if __name__ == "__main__":
    unittest.main()

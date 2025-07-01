"""
Test runner script for running unittest and FastAPI tests.
"""

import unittest
import sys


def run_unittest_tests():
    """Run all unittest-based tests"""
    test_suite = unittest.defaultTestLoader.discover(".", pattern="test_*_unittest.py")
    result = unittest.TextTestRunner().run(test_suite)
    return 0 if result.wasSuccessful() else 1


def run_fastapi_tests():
    """Run FastAPI-specific tests"""
    test_suite = unittest.defaultTestLoader.discover(".", pattern="test_fastapi.py")
    result = unittest.TextTestRunner().run(test_suite)
    return 0 if result.wasSuccessful() else 1


def run_all_tests():
    """Run all tests (unittest and FastAPI)"""
    test_suite = unittest.defaultTestLoader.discover(".", pattern="test_*.py")
    result = unittest.TextTestRunner().run(test_suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "unittest":
            sys.exit(run_unittest_tests())
        elif sys.argv[1] == "fastapi":
            sys.exit(run_fastapi_tests())
        else:
            print(
                "Unknown test type. Options: unittest, fastapi, or no argument to run all tests."
            )
            sys.exit(1)
    else:
        # Run all tests by default
        sys.exit(run_all_tests())

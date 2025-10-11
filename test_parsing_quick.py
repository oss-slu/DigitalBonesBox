#!/usr/bin/env python3


import sys
import os

# Add the current directory to path to import parsing module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parsing import ColorExtractor


def test_color_detection_quick():
    """Quick test of color detection functionality"""
    print("Testing Color Detection...")
    
    # Test the three target colors
    test_colors = [
        ("#FFC0CB", "pink", "Light pink"),
        ("#FF1493", "pink", "Deep pink"),
        ("#00FF00", "green", "Pure green"),
        ("#90EE90", "green", "Light green"),
        ("#FFA500", "orange", "Orange"),
        ("#FFD700", "orange", "Gold"),
        ("#0000FF", None, "Blue (should not detect)"),
        ("#FF0000", "pink", "Red (detected as pink due to broad range)"),
    ]
    
    passed = 0
    total = len(test_colors)
    
    for hex_color, expected, description in test_colors:
        result = ColorExtractor.identify_color_name(hex_color)
        if result == expected:
            print(f"✓ {description}: {hex_color} → {result}")
            passed += 1
        else:
            print(f"✗ {description}: {hex_color} → Expected {expected}, got {result}")
    
    print(f"\nColor Detection: {passed}/{total} tests passed")
    return passed == total


def test_hex_rgb_conversion_quick():
    """Quick test of hex/RGB conversion"""
    print("\nTesting Hex/RGB Conversion...")
    
    test_cases = [
        ("#FF0000", (255, 0, 0)),
        ("#00FF00", (0, 255, 0)),
        ("#0000FF", (0, 0, 255)),
        ("#FFC0CB", (255, 192, 203)),
    ]
    
    passed = 0
    total = len(test_cases) * 2  # Test both directions
    
    for hex_color, rgb_values in test_cases:
        # Test hex to RGB
        result = ColorExtractor.hex_to_rgb(hex_color)
        if result == rgb_values:
            print(f"✓ {hex_color} → {result}")
            passed += 1
        else:
            print(f"✗ {hex_color} → Expected {rgb_values}, got {result}")
        
        # Test RGB to hex
        result = ColorExtractor.rgb_to_hex(*rgb_values)
        if result == hex_color:
            print(f"✓ {rgb_values} → {result}")
            passed += 1
        else:
            print(f"✗ {rgb_values} → Expected {hex_color}, got {result}")
    
    print(f"\nHex/RGB Conversion: {passed}/{total} tests passed")
    return passed == total


def test_edge_cases_quick():
    """Quick test of edge cases"""
    print("\nTesting Edge Cases...")
    
    edge_cases = [
        (None, "None input"),
        ("", "Empty string"),
        ("invalid", "Invalid format"),
        ("#GGG", "Invalid hex"),
    ]
    
    passed = 0
    total = len(edge_cases)
    
    for test_input, description in edge_cases:
        try:
            result = ColorExtractor.identify_color_name(test_input)
            if result is None:
                print(f"✓ {description}: Correctly returned None")
                passed += 1
            else:
                print(f"✗ {description}: Expected None, got {result}")
        except Exception:
            print(f"✓ {description}: Exception handled correctly")
            passed += 1
    
    print(f"\nEdge Cases: {passed}/{total} tests passed")
    return passed == total


def main():
    """Run quick tests"""
    print("="*50)
    print("QUICK TEST SUITE FOR POWERPOINT PARSER")
    print("="*50)
    
    tests = [
        ("Color Detection", test_color_detection_quick),
        ("Hex/RGB Conversion", test_hex_rgb_conversion_quick),
        ("Edge Cases", test_edge_cases_quick),
    ]
    
    passed_tests = 0
    
    for test_name, test_func in tests:
        print(f"\n{'-'*20} {test_name} {'-'*20}")
        if test_func():
            passed_tests += 1
            print(f"✓ {test_name} PASSED")
        else:
            print(f"✗ {test_name} FAILED")
    
    print("\n" + "="*50)
    print(f"QUICK TEST RESULTS: {passed_tests}/{len(tests)} test suites passed")
    
    if passed_tests == len(tests):
        print("🎉 All quick tests passed!")
        return True
    else:
        print("❌ Some tests failed. Run test_parsing_comprehensive.py for detailed analysis.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
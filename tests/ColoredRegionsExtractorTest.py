#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from data_extraction.ColoredRegionsExtractor import AnatomicalShapeParser


def test_parser_functionality():
    print("Testing Enhanced Anatomical Parser...")
    print("=" * 50)
    
    # Test parser initialization
    xml_folder = Path("../.xml Files")
    if not xml_folder.exists():
        print("❌ XML files folder not found")
        return False
    
    parser = AnatomicalShapeParser(xml_folder)
    print("✓ Parser initialized successfully")
    
    # Test parsing a specific slide
    test_slide = 2  # Acetabulum slide
    result = parser.parse_slide(test_slide)
    
    if not result:
        print(f"❌ Failed to parse slide {test_slide}")
        return False
    
    print(f"✓ Slide {test_slide} parsed successfully")
    
    # Validate output structure
    required_fields = ['slide_number', 'colored_regions', 'total_regions']
    for field in required_fields:
        if field not in result:
            print(f"❌ Missing required field: {field}")
            return False
    
    print(f"✓ Output structure is valid")
    
    # Check if regions have path data
    if result['colored_regions']:
        region = result['colored_regions'][0]
        if 'path_data' not in region:
            print("❌ Missing path_data in region")
            return False
        print("✓ Path data present in regions")
    
    return True


def test_annotation_files():
    """Test that annotation files were created and are valid"""
    print("\nTesting Annotation Files...")
    print("=" * 50)
    
    annotations_dir = Path("annotations")
    if not annotations_dir.exists():
        print("❌ Annotations directory not found")
        return False
    
    json_files = list(annotations_dir.glob("*.json"))
    if not json_files:
        print("❌ No annotation files found")
        return False
    
    print(f"✓ Found {len(json_files)} annotation files")
    
    # Test a few key files
    test_files = [
        "acetabulum_annotations.json",
        "iliac_crest_annotations.json", 
        "pubic_tubercle_annotations.json"
    ]
    
    for filename in test_files:
        file_path = annotations_dir / filename
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # Check basic structure
                if 'slide_number' in data and 'colored_regions' in data:
                    print(f"✓ {filename} is valid")
                else:
                    print(f"⚠ {filename} missing required fields")
                    
            except json.JSONDecodeError:
                print(f"❌ {filename} has invalid JSON")
                return False
        else:
            print(f"⚠ {filename} not found")
    
    return True


def run_tests():
    """Run all tests"""
    print("ENHANCED ANATOMICAL PARSER TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Parser Functionality", test_parser_functionality),
        ("Annotation Files", test_annotation_files)
    ]
    
    passed = 0
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        if test_func():
            passed += 1
            print(f"✅ {test_name} PASSED")
        else:
            print(f"❌ {test_name} FAILED")
    
    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! Parser is working correctly.")
        return True
    else:
        print("⚠ Some tests failed. Check the output above.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
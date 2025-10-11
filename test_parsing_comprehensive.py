#!/usr/bin/env python3


import json
import shutil
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
import sys
import os

# Add the current directory to path to import parsing module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parsing import ColorExtractor, SlideParser


class TestColorExtractor:
    """Test cases for ColorExtractor class"""
    
    @staticmethod
    def test_hex_to_rgb():
        """Test hex to RGB conversion"""
        print("\n" + "="*50)
        print("Testing ColorExtractor.hex_to_rgb()")
        print("="*50)
        
        test_cases = [
            ("#FF0000", (255, 0, 0), "Pure red"),
            ("#00FF00", (0, 255, 0), "Pure green"),
            ("#0000FF", (0, 0, 255), "Pure blue"),
            ("#FFFFFF", (255, 255, 255), "White"),
            ("#000000", (0, 0, 0), "Black"),
            ("#FFC0CB", (255, 192, 203), "Pink"),
            ("#FFA500", (255, 165, 0), "Orange"),
            ("#90EE90", (144, 238, 144), "Light green"),
            ("FF0000", (255, 0, 0), "No # prefix - implementation accepts this"),
            ("#GGG", None, "Invalid hex chars"),
            ("#FF00", None, "Too short"),
            ("#FF00000", None, "Too long"),
            ("", None, "Empty string"),
            (None, None, "None input"),
        ]
        
        passed = 0
        failed = 0
        
        for hex_input, expected, description in test_cases:
            try:
                result = ColorExtractor.hex_to_rgb(hex_input)
                if result == expected:
                    print(f"✓ {description}: {hex_input} → {result}")
                    passed += 1
                else:
                    print(f"✗ {description}: {hex_input} → Expected {expected}, got {result}")
                    failed += 1
            except Exception as e:
                if expected is None:
                    print(f"✓ {description}: {hex_input} → Exception handled correctly")
                    passed += 1
                else:
                    print(f"✗ {description}: {hex_input} → Unexpected exception: {e}")
                    failed += 1
        
        print(f"\nHex to RGB Tests: {passed} passed, {failed} failed")
        return failed == 0
    
    @staticmethod
    def test_rgb_to_hex():
        """Test RGB to hex conversion"""
        print("\n" + "="*50)
        print("Testing ColorExtractor.rgb_to_hex()")
        print("="*50)
        
        test_cases = [
            ((255, 0, 0), "#FF0000", "Pure red"),
            ((0, 255, 0), "#00FF00", "Pure green"),
            ((0, 0, 255), "#0000FF", "Pure blue"),
            ((255, 255, 255), "#FFFFFF", "White"),
            ((0, 0, 0), "#000000", "Black"),
            ((255, 192, 203), "#FFC0CB", "Pink"),
            ((255, 165, 0), "#FFA500", "Orange"),
            ((144, 238, 144), "#90EE90", "Light green"),
        ]
        
        passed = 0
        failed = 0
        
        for rgb_input, expected, description in test_cases:
            try:
                result = ColorExtractor.rgb_to_hex(*rgb_input)
                if result == expected:
                    print(f"✓ {description}: {rgb_input} → {result}")
                    passed += 1
                else:
                    print(f"✗ {description}: {rgb_input} → Expected {expected}, got {result}")
                    failed += 1
            except Exception as e:
                print(f"✗ {description}: {rgb_input} → Exception: {e}")
                failed += 1
        
        print(f"\nRGB to Hex Tests: {passed} passed, {failed} failed")
        return failed == 0
    
    @staticmethod
    def test_identify_color_name():
        """Test color identification"""
        print("\n" + "="*50)
        print("Testing ColorExtractor.identify_color_name()")
        print("="*50)
        
        # Test cases based on current implementation behavior
        test_cases = [
            # Pink colors
            ("#FFC0CB", "pink", "Light pink"),
            ("#FF1493", "pink", "Deep pink"),
            ("#FF69B4", "pink", "Hot pink"),
            ("#FF00FF", "pink", "Magenta"),
            
            # Green colors
            ("#00FF00", "green", "Pure green"),
            ("#90EE90", "green", "Light green"),
            ("#32CD32", "green", "Lime green"),
            ("#228B22", "green", "Forest green"),
            
            # Orange colors
            ("#FFA500", "orange", "Orange"),
            ("#FFD700", "orange", "Gold"),
            
            # Colors that should not be detected (None)
            ("#0000FF", None, "Blue"),
            ("#000000", None, "Black"),
            ("#808080", None, "Gray"),
            
            # Edge cases
            (None, None, "None input"),
            ("", None, "Empty string"),
            ("invalid", None, "Invalid format"),
        ]
        
        passed = 0
        failed = 0
        
        for hex_input, expected, description in test_cases:
            try:
                result = ColorExtractor.identify_color_name(hex_input)
                if result == expected:
                    print(f"✓ {description}: {hex_input} → {result}")
                    passed += 1
                else:
                    print(f"✗ {description}: {hex_input} → Expected {expected}, got {result}")
                    failed += 1
            except Exception as e:
                if expected is None and hex_input in [None, "", "invalid"]:
                    print(f"✓ {description}: Exception handled correctly")
                    passed += 1
                else:
                    print(f"✗ {description}: Unexpected exception: {e}")
                    failed += 1
        
        print(f"\nColor Identification Tests: {passed} passed, {failed} failed")
        return failed == 0


class TestSlideParser:
    """Test cases for SlideParser class"""
    
    @staticmethod
    def create_mock_xml_structure(temp_dir):
        """Create mock XML files for testing"""
        slides_dir = temp_dir / "slides"
        rels_dir = slides_dir / "_rels"
        slides_dir.mkdir(parents=True)
        rels_dir.mkdir()
        
        # Create mock slide2.xml with colored shape
        slide2_content = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <p:cSld>
        <p:spTree>
            <p:sp>
                <p:nvSpPr>
                    <p:cNvPr id="1" name="Acetabulum"/>
                </p:nvSpPr>
                <p:spPr>
                    <a:xfrm>
                        <a:off x="100" y="200"/>
                        <a:ext cx="300" cy="400"/>
                    </a:xfrm>
                    <a:solidFill>
                        <a:srgbClr val="FFC0CB"/>
                    </a:solidFill>
                </p:spPr>
                <p:txBody>
                    <a:p>
                        <a:r>
                            <a:t>Acetabulum</a:t>
                        </a:r>
                    </a:p>
                </p:txBody>
            </p:sp>
        </p:spTree>
    </p:cSld>
</p:sld>'''
        
        with open(slides_dir / "slide2.xml", 'w') as f:
            f.write(slide2_content)
        
        # Create mock slide2.xml.rels
        rels_content = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slide3.xml"/>
</Relationships>'''
        
        with open(rels_dir / "slide2.xml.rels", 'w') as f:
            f.write(rels_content)
        
        return slides_dir
    
    @staticmethod
    def test_slide_parsing():
        """Test slide parsing functionality"""
        print("\n" + "="*50)
        print("Testing SlideParser functionality")
        print("="*50)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create mock XML structure
            slides_dir = TestSlideParser.create_mock_xml_structure(temp_path)
            
            # Test parser creation
            try:
                parser = SlideParser(slides_dir)
                print("✓ SlideParser created successfully")
            except Exception as e:
                print(f"✗ Failed to create SlideParser: {e}")
                return False
            
            # Test relationship parsing
            try:
                hyperlinks = parser.parse_slide_rels(2)
                if isinstance(hyperlinks, dict):
                    print(f"✓ Relationship parsing works: {len(hyperlinks)} links found")
                else:
                    print("✗ Relationship parsing returned invalid type")
                    return False
            except Exception as e:
                print(f"✗ Relationship parsing failed: {e}")
                return False
            
            # Test slide parsing
            try:
                slide_data = parser.parse_slide(2)
                if slide_data and isinstance(slide_data, dict):
                    print(f"✓ Slide parsing works: {slide_data.get('total_colored_regions', 0)} regions found")
                    
                    # Validate slide data structure
                    required_keys = ['slide_number', 'has_hyperlinks', 'colored_regions', 
                                   'total_colored_regions', 'colors_found']
                    missing_keys = [key for key in required_keys if key not in slide_data]
                    if missing_keys:
                        print(f"✗ Missing keys in slide data: {missing_keys}")
                        return False
                    else:
                        print("✓ Slide data structure is valid")
                else:
                    print("✗ Slide parsing returned invalid data")
                    return False
            except Exception as e:
                print(f"✗ Slide parsing failed: {e}")
                return False
            
            return True
    
    @staticmethod
    def test_filename_sanitization():
        """Test filename sanitization"""
        print("\n" + "="*50)
        print("Testing filename sanitization")
        print("="*50)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            slides_dir = temp_path / "slides"
            slides_dir.mkdir()
            
            parser = SlideParser(slides_dir)
            
            test_cases = [
                ("Acetabulum", "Hip_Socket", "Acetabulum_Hip_Socket"),
                ("Iliac Crest", "Unknown", "Iliac_Crest"),
                ("Unknown", "Anterior Superior", "Anterior_Superior"),
                ("Test/Name", "Sub\\Bone", "Test_Name_Sub_Bone"),
                ("Very Long Bone Name That Should Be Truncated Because It Is Too Long", "Subbone", "Very_Long_Bone_Name_That_Should_Be_Truncated_B"),
                ("", "", "unknown_region"),
                ("Unknown", "Unknown", "unknown_region"),
            ]
            
            passed = 0
            failed = 0
            
            for bone_name, subbone_name, expected_start in test_cases:
                try:
                    result = parser.sanitize_filename(bone_name, subbone_name)
                    if expected_start in result or result == expected_start:
                        print(f"✓ '{bone_name}' + '{subbone_name}' → '{result}'")
                        passed += 1
                    else:
                        print(f"✗ '{bone_name}' + '{subbone_name}' → Expected to contain '{expected_start}', got '{result}'")
                        failed += 1
                except Exception as e:
                    print(f"✗ '{bone_name}' + '{subbone_name}' → Exception: {e}")
                    failed += 1
            
            print(f"\nFilename Sanitization Tests: {passed} passed, {failed} failed")
            return failed == 0


class TestWorkflow:
    """Test the complete workflow"""
    
    @staticmethod
    def test_complete_workflow():
        """Test the complete processing workflow"""
        print("\n" + "="*50)
        print("Testing complete workflow")
        print("="*50)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create more comprehensive mock data
            slides_dir = temp_path / "slides"
            rels_dir = slides_dir / "_rels"
            slides_dir.mkdir(parents=True)
            rels_dir.mkdir()
            
            # Create multiple slides with different colored regions
            slides_to_create = [
                (2, "Acetabulum", "FFC0CB", "pink"),  # Light pink
                (3, "Iliac_Crest", "00FF00", "green"),  # Green
                (4, "Ischial_Spine", "FFA500", "orange"),  # Orange
            ]
            
            for slide_num, shape_name, color_val, color_name in slides_to_create:
                slide_content = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld>
        <p:spTree>
            <p:sp>
                <p:nvSpPr>
                    <p:cNvPr id="{slide_num}" name="{shape_name}"/>
                </p:nvSpPr>
                <p:spPr>
                    <a:xfrm>
                        <a:off x="{100 * slide_num}" y="{200 * slide_num}"/>
                        <a:ext cx="300" cy="400"/>
                    </a:xfrm>
                    <a:solidFill>
                        <a:srgbClr val="{color_val}"/>
                    </a:solidFill>
                </p:spPr>
                <p:txBody>
                    <a:p>
                        <a:r>
                            <a:t>{shape_name}</a:t>
                        </a:r>
                    </a:p>
                </p:txBody>
            </p:sp>
        </p:spTree>
    </p:cSld>
</p:sld>'''
                
                with open(slides_dir / f"slide{slide_num}.xml", 'w') as f:
                    f.write(slide_content)
            
            # Change to temp directory to avoid polluting current directory
            original_cwd = os.getcwd()
            os.chdir(temp_path)
            
            try:
                parser = SlideParser(slides_dir)
                
                # Test Phase 1: Process individual slides
                print("\nTesting Phase 1: Individual slide processing...")
                processed_slides = parser.process_all_slides()
                
                if processed_slides:
                    print(f"✓ Processed {len(processed_slides)} slides")
                    
                    # Check if JSON files were created
                    json_files = list(parser.output_folder.glob("slide*.json"))
                    if json_files:
                        print(f"✓ Created {len(json_files)} JSON files")
                        
                        # Validate JSON structure
                        valid_files = 0
                        for json_file in json_files:
                            try:
                                with open(json_file, 'r') as f:
                                    data = json.load(f)
                                    if all(key in data for key in ['slide_number', 'colored_regions', 'total_colored_regions']):
                                        valid_files += 1
                            except Exception as e:
                                print(f"✗ Invalid JSON in {json_file}: {e}")
                        
                        if valid_files == len(json_files):
                            print(f"✓ All {valid_files} JSON files have valid structure")
                        else:
                            print(f"✗ Only {valid_files}/{len(json_files)} JSON files have valid structure")
                            return False
                    else:
                        print("✗ No JSON files were created")
                        return False
                else:
                    print("✗ No slides were processed")
                    return False
                
                # Test Phase 2: Combine slides
                print("\nTesting Phase 2: Combining slides...")
                combined_data = parser.combine_all_slides()
                
                if combined_data:
                    print("✓ Successfully combined slide data")
                    
                    # Validate combined data structure
                    required_keys = ['total_slides', 'total_colored_regions', 'colors_used', 'slides']
                    if all(key in combined_data for key in required_keys):
                        print("✓ Combined data has valid structure")
                        
                        # Check if master file exists
                        master_file = parser.output_folder / "all_colored_regions.json"
                        if master_file.exists():
                            print("✓ Master JSON file created")
                            return True
                        else:
                            print("✗ Master JSON file not created")
                            return False
                    else:
                        print("✗ Combined data missing required keys")
                        return False
                else:
                    print("✗ Failed to combine slide data")
                    return False
                    
            except Exception as e:
                print(f"✗ Workflow test failed with exception: {e}")
                return False
            finally:
                os.chdir(original_cwd)


def run_all_tests():
    """Run all test suites"""
    print("="*60)
    print("COMPREHENSIVE TEST SUITE FOR POWERPOINT PARSER")
    print("="*60)
    
    test_results = []
    
    # Run ColorExtractor tests
    print("\n" + "="*60)
    print("COLOR EXTRACTOR TESTS")
    print("="*60)
    
    test_results.append(("Hex to RGB", TestColorExtractor.test_hex_to_rgb()))
    test_results.append(("RGB to Hex", TestColorExtractor.test_rgb_to_hex()))
    test_results.append(("Color Identification", TestColorExtractor.test_identify_color_name()))
    
    # Run SlideParser tests
    print("\n" + "="*60)
    print("SLIDE PARSER TESTS")
    print("="*60)
    
    test_results.append(("Slide Parsing", TestSlideParser.test_slide_parsing()))
    test_results.append(("Filename Sanitization", TestSlideParser.test_filename_sanitization()))
    
    # Run workflow tests
    print("\n" + "="*60)
    print("WORKFLOW TESTS")
    print("="*60)
    
    test_results.append(("Complete Workflow", TestWorkflow.test_complete_workflow()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)
    
    passed_tests = []
    failed_tests = []
    
    for test_name, result in test_results:
        if result:
            print(f"✓ {test_name:<25} PASSED")
            passed_tests.append(test_name)
        else:
            print(f"✗ {test_name:<25} FAILED")
            failed_tests.append(test_name)
    
    print("-" * 60)
    print(f"TOTAL: {len(passed_tests)}/{len(test_results)} tests passed")
    
    if failed_tests:
        print(f"\n❌ FAILED TESTS: {', '.join(failed_tests)}")
        print("Please review the implementation and fix the issues.")
        return False
    else:
        print("\n🎉 ALL TESTS PASSED!")
        print("The implementation is working correctly.")
        return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
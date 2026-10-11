# Migration report

This file is made by running `node boneset-api/scripts/migration-report.js` (Issue #468).
The script goes through every item in the viewer's dropdowns and imports it the same way
Import bone images does in the Scene Editor (images, labels, pointer lines and colored
regions). It only does this in memory, so no scenes get saved. Don't edit this file by hand,
just run the script again.

## Totals

| | Count |
|---|---|
| Items in the viewer's dropdowns | 200 |
| Imported | 179 |
| Not imported (no content or invalid id) | 21 |
| Imported with 1 image | 55 |
| Imported with 2 images | 100 |
| Imported with 3 or more images | 24 |
| Images | 334 |
| Labels | 483 |
| Pointer lines | 480 |
| Colored regions | 688 |
| Imported items with import notes | 14 |

## All items

| Boneset | Type | Item | Status | Images | Labels | Lines | Regions | Notes |
|---|---|---|---|---|---|---|---|---|
| bony_pelvis | boneset | `bony_pelvis` | imported | 2 | 5 | 9 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone | `ilium` | imported | 2 | 6 | 9 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `iliac_crest` | imported | 2 | 2 | 2 | 2 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `anterior_iliac_spines` | imported | 2 | 0 | 0 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `posterior_iliac_spines` | imported | 2 | 0 | 0 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `auricular_surface` | imported | 1 | 0 | 0 | 1 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone | `ischium` | imported | 2 | 7 | 10 | 0 |  |
| bony_pelvis | bone part | `ramus` | imported | 2 | 0 | 0 | 2 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `ischial_tuberosity` | imported | 2 | 2 | 4 | 2 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `ischial_spine` | imported | 2 | 0 | 0 | 2 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `sciatic_notches` | imported | 2 | 0 | 0 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone | `pubis` | imported | 2 | 6 | 11 | 0 |  |
| bony_pelvis | bone part | `pubic_rami` | imported | 2 | 1 | 2 | 4 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `pubis_pectineal_line` | imported | 1 | 1 | 1 | 1 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `symphyseal_surface` | imported | 1 | 0 | 0 | 1 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| bony_pelvis | bone part | `pubic_tubercle` | imported | 1 | 1 | 2 | 1 | colored regions: Older format: the viewer nudges these by hand, so positions may differ slightly |
| skull | boneset | `skull` | not imported | | | | | No existing content found for boneId: skull |
| skull | bone | `anterior` | not imported | | | | | No existing content found for boneId: anterior |
| skull | bone part | `anterior_frontal_bone` | imported | 1 | 5 | 6 | 0 |  |
| skull | bone part | `anterior_mandible` | imported | 1 | 5 | 5 | 1 |  |
| skull | bone part | `anterior_maxilla` | imported | 1 | 4 | 3 | 1 |  |
| skull | bone part | `anterior_nasal_bone` | imported | 1 | 0 | 0 | 0 |  |
| skull | bone part | `anterior_sphenoid_bone` | imported | 1 | 4 | 2 | 0 |  |
| skull | bone part | `anterior_zygomatic_bone` | imported | 1 | 3 | 3 | 0 |  |
| skull | bone | `lateral` | not imported | | | | | No existing content found for boneId: lateral |
| skull | bone part | `lateral_ethmoid_bone` | imported | 1 | 0 | 0 | 0 |  |
| skull | bone part | `lateral_lacrimal_bone` | imported | 1 | 2 | 2 | 0 |  |
| skull | bone part | `lateral_mandible` | imported | 1 | 7 | 7 | 0 |  |
| skull | bone part | `lateral_parietal_bone` | imported | 1 | 0 | 0 | 0 |  |
| skull | bone part | `lateral_sphenoid_bone` | imported | 1 | 0 | 0 | 0 |  |
| skull | bone part | `lateral_temporal_bone` | not imported | | | | | No existing content found for boneId: lateral_temporal_bone |
| skull | bone | `inferior` | not imported | | | | | No existing content found for boneId: inferior |
| skull | bone part | `inferior_maxilla` | imported | 1 | 5 | 7 | 1 |  |
| skull | bone part | `inferior_occipital_bone` | imported | 1 | 6 | 9 | 0 |  |
| skull | bone part | `inferior_palatine_bone` | imported | 1 | 3 | 4 | 0 |  |
| skull | bone part | `inferior_sphenoid_bone` | imported | 1 | 9 | 14 | 0 |  |
| skull | bone part | `inferior_temporal_bone` | imported | 1 | 7 | 12 | 0 |  |
| skull | bone part | `inferior_vomer` | imported | 1 | 1 | 2 | 1 |  |
| skull | bone | `superior` | not imported | | | | | No existing content found for boneId: superior |
| skull | bone part | `superior_ethmoid_bone` | imported | 1 | 3 | 5 | 0 |  |
| skull | bone part | `superior_frontal_bone` | imported | 1 | 3 | 5 | 0 |  |
| skull | bone part | `superior_occipital_bone` | not imported | | | | | No existing content found for boneId: superior_occipital_bone |
| skull | bone part | `superior_sphenoid_bone` | imported | 1 | 8 | 12 | 0 |  |
| skull | bone part | `superior_temporal_bone` | imported | 1 | 5 | 8 | 0 |  |
| thorax | boneset | `thorax` | imported | 10 | 5 | 0 | 0 |  |
| thorax | bone | `sternum` | imported | 2 | 5 | 10 | 0 |  |
| thorax | bone part | `sternum_manubrium` | imported | 2 | 3 | 6 | 4 |  |
| thorax | bone part | `sternum_body` | not imported | | | | | No images listed for this item |
| thorax | bone part | `sternum_xiphoid_process` | imported | 2 | 0 | 0 | 4 |  |
| thorax | bone | `clavicle` | imported | 2 | 2 | 0 | 0 |  |
| thorax | bone | `first_rib` | imported | 2 | 9 | 8 | 0 |  |
| thorax | bone part | `first_rib_head_and_neck` | imported | 2 | 2 | 0 | 8 |  |
| thorax | bone part | `first_rib_tubercles` | imported | 2 | 2 | 0 | 6 |  |
| thorax | bone part | `first_rib_grooves_for_subclavian_vessels` | not imported | | | | | No existing content found for boneId: first_rib_grooves_for_subclavian_vessels |
| thorax | bone | `typical_rib` | imported | 2 | 8 | 12 | 0 |  |
| thorax | bone | `scapula` | not imported | | | | | No existing content found for boneId: scapula |
| thorax | bone part | `scapula_body` | imported | 1 | 6 | 8 | 0 |  |
| thorax | bone part | `scapula_spine` | not imported | | | | | No existing content found for boneId: scapula_spine |
| thorax | bone part | `scapula_acromion_and_coracoid_process` | not imported | | | | | No existing content found for boneId: scapula_acromion_and_coracoid_process |
| thorax | bone part | `scapula_fossae` | not imported | | | | | No existing content found for boneId: scapula_fossae |
| vertebrae | boneset | `vertebrae` | imported | 1 | 11 | 11 | 4 |  |
| vertebrae | bone | `atlas` | imported | 2 | 17 | 20 | 4 |  |
| vertebrae | bone part | `atlas_anterior_and_posterior_tubercles` | imported | 2 | 0 | 0 | 8 |  |
| vertebrae | bone part | `atlas_transverse_process` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone part | `atlas_arches` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone part | `atlas_groove_for_vertebral_artery` | imported | 1 | 2 | 0 | 2 |  |
| vertebrae | bone part | `atlas_articular_facet_for_dens` | imported | 1 | 0 | 0 | 1 |  |
| vertebrae | bone part | `atlas_lateral_mass` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone part | `atlas_articular_surfaces` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone | `axis` | imported | 3 | 13 | 16 | 0 |  |
| vertebrae | bone part | `axis_body` | imported | 2 | 4 | 6 | 6 |  |
| vertebrae | bone part | `axis_body_(dens)` | not imported | | | | | Invalid boneId format |
| vertebrae | bone part | `axis_transverse_process` | imported | 2 | 3 | 0 | 10 |  |
| vertebrae | bone part | `axis_transverse_foramen` | not imported | | | | | No images listed for this item |
| vertebrae | bone part | `axis_pedicle` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone part | `axis_lamina` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone part | `axis_spinous_process` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `axis_articular_surfaces` | imported | 3 | 3 | 0 | 18 |  |
| vertebrae | bone | `cervical` | imported | 3 | 13 | 15 | 0 |  |
| vertebrae | bone part | `cervical_body` | imported | 3 | 3 | 0 | 12 |  |
| vertebrae | bone part | `cervical_pedicle` | imported | 2 | 2 | 0 | 8 |  |
| vertebrae | bone part | `cervical_transverse_process` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone part | `cervical_lamina` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone part | `cervical_spinous_process` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `cervical_vertebral_arch` | imported | 1 | 1 | 0 | 1 |  |
| vertebrae | bone part | `cervical_vertebral_foramen` | imported | 1 | 1 | 0 | 1 |  |
| vertebrae | bone | `thoracic` | imported | 3 | 19 | 27 | 0 |  |
| vertebrae | bone part | `thoracic_body` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `thoracic_transverse_process` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone part | `thoracic_costal_facets` | imported | 3 | 3 | 0 | 27 |  |
| vertebrae | bone part | `thoracic_vertebral_notch` | imported | 1 | 5 | 5 | 4 |  |
| vertebrae | bone part | `thoracic_spinous_process` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `thoracic_articular_surfaces` | imported | 3 | 3 | 0 | 18 |  |
| vertebrae | bone | `lumbar` | imported | 3 | 18 | 21 | 0 |  |
| vertebrae | bone part | `lumbar_body` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `lumbar_transverse_process` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone part | `lumbar_spinous_process` | imported | 3 | 3 | 0 | 9 |  |
| vertebrae | bone part | `lumbar_accessory_process` | imported | 1 | 1 | 0 | 2 |  |
| vertebrae | bone part | `lumbar_mammillary_process` | imported | 1 | 1 | 0 | 2 |  |
| vertebrae | bone part | `lumbar_articular_surfaces` | imported | 3 | 3 | 0 | 15 |  |
| vertebrae | bone | `sacrum_and_coccyx` | imported | 2 | 8 | 16 | 0 |  |
| vertebrae | bone part | `sacrum_and_coccyx_sacral_promontory` | imported | 1 | 0 | 0 | 1 |  |
| vertebrae | bone part | `sacrum_and_coccyx_superior_articular_process` | imported | 1 | 0 | 0 | 2 |  |
| vertebrae | bone part | `sacrum_and_coccyx_anterior_and_posterior_sacral_foramina` | not imported | | | | | No existing content found for boneId: sacrum_and_coccyx_anterior_and_posterior_sacral_foramina |
| vertebrae | bone part | `sacrum_and_coccyx_median_sacral_crest` | imported | 1 | 0 | 0 | 1 |  |
| vertebrae | bone part | `sacrum_and_coccyx__sacral_hiatus` | not imported | | | | | No existing content found for boneId: sacrum_and_coccyx__sacral_hiatus |
| vertebrae | bone part | `sacrum_and_coccyx_articular_surface_for_ilium` | imported | 1 | 0 | 0 | 2 |  |
| vertebrae | bone part | `coccyx` | imported | 2 | 0 | 0 | 0 |  |
| upper_limb | boneset | `upper_limb` | not imported | | | | | No existing content found for boneId: upper_limb |
| upper_limb | bone | `humerus` | imported | 2 | 19 | 19 | 0 |  |
| upper_limb | bone part | `humerus_head` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `humerus_greater_tubercle` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `humerus_lesser_tubercle` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `humerus_intertubercular_sulcus` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `humerus_anatomical_neck` | imported | 2 | 0 | 0 | 8 |  |
| upper_limb | bone part | `humerus_shaft` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `humerus_deltoid_tuberosity` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `humerus_radial_sulcus` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `humerus_condyles` | imported | 2 | 0 | 0 | 8 |  |
| upper_limb | bone part | `humerus_radial_and_coronoid_fossae` | imported | 1 | 0 | 0 | 0 |  |
| upper_limb | bone part | `humerus_olecranon_fossa` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `humerus_capitulum_and_trochlea` | imported | 2 | 1 | 0 | 0 |  |
| upper_limb | bone | `ulna` | imported | 2 | 7 | 9 | 0 |  |
| upper_limb | bone part | `ulna_olecranon_process` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `ulna_trochlear_notch` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `ulna_coronoid_process` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `ulna_ulnar_tuberosity` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `ulna_radial_notch` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `ulna_styloid_process` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone | `radius` | imported | 2 | 8 | 9 | 0 |  |
| upper_limb | bone part | `radius_head` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `radius_neck` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `radius_radial_tuberosity` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `radius_ulnar_notch` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone part | `radius_styloid_process` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `radius_dorsal_tubercle` | imported | 1 | 0 | 0 | 1 |  |
| upper_limb | bone | `hand` | imported | 2 | 0 | 0 | 0 |  |
| upper_limb | bone part | `hand_scaphoid` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_lunate` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_triquetrum` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_pisiform` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_trapezium` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_trapezoid` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_capitate` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_hamate` | imported | 2 | 0 | 0 | 4 |  |
| upper_limb | bone part | `hand_metacarpals` | imported | 2 | 13 | 6 | 12 |  |
| upper_limb | bone part | `hand_phalanges` | not imported | | | | | No existing content found for boneId: hand_phalanges |
| lower_limb | boneset | `lower_limb` | not imported | | | | | No images listed for this item |
| lower_limb | bone | `femur` | imported | 2 | 21 | 17 | 0 |  |
| lower_limb | bone part | `femur_head` | imported | 3 | 1 | 1 | 9 |  |
| lower_limb | bone part | `femur_neck` | imported | 3 | 0 | 0 | 9 |  |
| lower_limb | bone part | `greater_trochanter` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `lesser_trochanter` | imported | 3 | 0 | 0 | 9 |  |
| lower_limb | bone part | `intertrochanteric_line` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `gluteal_tuberosity` | imported | 1 | 0 | 0 | 1 |  |
| lower_limb | bone part | `femur_pectineal_line` | imported | 1 | 0 | 0 | 1 |  |
| lower_limb | bone part | `femur_shaft` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `linea_aspera` | imported | 2 | 0 | 0 | 10 |  |
| lower_limb | bone part | `femur_condyles` | imported | 2 | 0 | 0 | 8 |  |
| lower_limb | bone part | `adductor_tubercle` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `intercondylar_fossa` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `patellar_surface` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone | `patella` | imported | 2 | 4 | 3 | 0 |  |
| lower_limb | bone part | `anterior_surface` | imported | 1 | 0 | 0 | 2 |  |
| lower_limb | bone part | `articular_surface` | imported | 1 | 3 | 3 | 2 |  |
| lower_limb | bone | `tibia` | imported | 2 | 20 | 24 | 0 |  |
| lower_limb | bone part | `proximal_end` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `tibial_tuberosity` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `gerdy_tubercle` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `tibia_shaft` | imported | 2 | 5 | 5 | 4 |  |
| lower_limb | bone part | `tibia_medial_surface` | imported | 2 | 5 | 5 | 2 |  |
| lower_limb | bone part | `tibia_lateral_surface` | imported | 2 | 5 | 5 | 2 |  |
| lower_limb | bone part | `tibia_posterior_surface` | imported | 2 | 4 | 4 | 4 |  |
| lower_limb | bone part | `distal_end` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone | `fibula` | imported | 2 | 15 | 16 | 0 |  |
| lower_limb | bone part | `fibula_head` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `fibula_shaft` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `interosseous_border` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `posterior_border` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `anterior_border` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `fibula_lateral_surface` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `fibula_medial_surface` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `fibula_posterior_surface` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `lateral_malleolus` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone | `foot` | imported | 2 | 0 | 0 | 0 |  |
| lower_limb | bone part | `calcaneus` | imported | 2 | 2 | 2 | 4 |  |
| lower_limb | bone part | `sustentaculum_tali` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `tarsal_sinus` | imported | 2 | 0 | 0 | 2 |  |
| lower_limb | bone part | `talus` | imported | 2 | 3 | 3 | 4 |  |
| lower_limb | bone part | `navicular` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `cuboid` | imported | 2 | 1 | 1 | 4 |  |
| lower_limb | bone part | `medial_cuneiform` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `intermediate_cuneiform` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `lateral_cuneiform` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `metatarsals_and_phalanges` | imported | 1 | 16 | 11 | 0 |  |
| lower_limb | bone part | `1st_metatarsal` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `proximal_phalanx` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `first_distal_phalanx` | imported | 2 | 0 | 0 | 4 |  |
| lower_limb | bone part | `2nd-5th_metatarsals` | not imported | | | | | Invalid boneId format |
| lower_limb | bone part | `phalanges` | imported | 2 | 0 | 0 | 26 |  |
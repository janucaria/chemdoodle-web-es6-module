import * as c from '../../ChemDoodle';

export default function VisualSpecifications() {
  // canvas properties
  this.backgroundColor = c.default_backgroundColor;
  this.scale = c.default_scale;
  this.rotateAngle = c.default_rotateAngle;
  this.bondLength_2D = c.default_bondLength_2D;
  this.angstromsPerBondLength = c.default_angstromsPerBondLength;
  this.lightDirection_3D = c.default_lightDirection_3D.slice(0);
  this.lightDiffuseColor_3D = c.default_lightDiffuseColor_3D;
  this.lightSpecularColor_3D = c.default_lightSpecularColor_3D;
  this.projectionPerspective_3D = c.default_projectionPerspective_3D;
  this.projectionPerspectiveVerticalFieldOfView_3D = c.default_projectionPerspectiveVerticalFieldOfView_3D;
  this.projectionOrthoWidth_3D = c.default_projectionOrthoWidth_3D;
  this.projectionWidthHeightRatio_3D = c.default_projectionWidthHeightRatio_3D;
  this.projectionFrontCulling_3D = c.default_projectionFrontCulling_3D;
  this.projectionBackCulling_3D = c.default_projectionBackCulling_3D;
  this.cullBackFace_3D = c.default_cullBackFace_3D;
  this.fog_mode_3D = c.default_fog_mode_3D;
  this.fog_color_3D = c.default_fog_color_3D;
  this.fog_start_3D = c.default_fog_start_3D;
  this.fog_end_3D = c.default_fog_end_3D;
  this.fog_density_3D = c.default_fog_density_3D;
  this.shadow_3D = c.default_shadow_3D;
  this.shadow_intensity_3D = c.default_shadow_intensity_3D;
  this.flat_color_3D = c.default_flat_color_3D;
  this.antialias_3D = c.default_antialias_3D;
  this.gammaCorrection_3D = c.default_gammaCorrection_3D;
  this.colorHover = c.default_colorHover;
  this.colorSelect = c.default_colorSelect;
  this.colorError = c.default_colorError;
  this.colorPreview = c.default_colorPreview;
  
  // 3D shaders
  // ssao properties
  this.ssao_3D = c.default_ssao_3D;
  this.ssao_kernel_radius = c.default_ssao_kernel_radius;
  this.ssao_kernel_samples = c.default_ssao_kernel_samples;
  this.ssao_power = c.default_ssao_power;
  // outline properties
  this.outline_3D = c.default_outline_3D;
  this.outline_normal_threshold = c.default_outline_normal_threshold;
  this.outline_depth_threshold = c.default_outline_depth_threshold;
  this.outline_thickness = c.default_outline_thickness;
  // fxaa properties
  this.fxaa_edgeThreshold = c.default_fxaa_edgeThreshold ;
  this.fxaa_edgeThresholdMin = c.default_fxaa_edgeThresholdMin ;
  this.fxaa_searchSteps = c.default_fxaa_searchSteps;
  this.fxaa_searchThreshold = c.default_fxaa_searchThreshold;
  this.fxaa_subpixCap = c.default_fxaa_subpixCap;
  this.fxaa_subpixTrim = c.default_fxaa_subpixTrim;

  // atom properties
  this.atoms_display = c.default_atoms_display;
  this.atoms_color = c.default_atoms_color;
  this.atoms_font_size_2D = c.default_atoms_font_size_2D;
  this.atoms_font_families_2D = c.default_atoms_font_families_2D.slice(0);
  this.atoms_font_bold_2D = c.default_atoms_font_bold_2D;
  this.atoms_font_italic_2D = c.default_atoms_font_italic_2D;
  this.atoms_circles_2D = c.default_atoms_circles_2D;
  this.atoms_circleDiameter_2D = c.default_atoms_circleDiameter_2D;
  this.atoms_circleBorderWidth_2D = c.default_atoms_circleBorderWidth_2D;
  this.atoms_lonePairDistance_2D = c.default_atoms_lonePairDistance_2D;
  this.atoms_lonePairSpread_2D = c.default_atoms_lonePairSpread_2D;
  this.atoms_lonePairDiameter_2D = c.default_atoms_lonePairDiameter_2D;
  this.atoms_useJMOLColors = c.default_atoms_useJMOLColors;
  this.atoms_usePYMOLColors = c.default_atoms_usePYMOLColors;
  this.atoms_HBlack_2D = c.default_atoms_HBlack_2D;
  this.atoms_implicitHydrogens_2D = c.default_atoms_implicitHydrogens_2D;
  this.atoms_displayTerminalCarbonLabels_2D = c.default_atoms_displayTerminalCarbonLabels_2D;
  this.atoms_showHiddenCarbons_2D = c.default_atoms_showHiddenCarbons_2D;
  this.atoms_showAttributedCarbons_2D = c.default_atoms_showAttributedCarbons_2D;
  this.atoms_displayAllCarbonLabels_2D = c.default_atoms_displayAllCarbonLabels_2D;
  this.atoms_resolution_3D = c.default_atoms_resolution_3D;
  this.atoms_sphereDiameter_3D = c.default_atoms_sphereDiameter_3D;
  this.atoms_useVDWDiameters_3D = c.default_atoms_useVDWDiameters_3D;
  this.atoms_vdwMultiplier_3D = c.default_atoms_vdwMultiplier_3D;
  this.atoms_materialAmbientColor_3D = c.default_atoms_materialAmbientColor_3D;
  this.atoms_materialSpecularColor_3D = c.default_atoms_materialSpecularColor_3D;
  this.atoms_materialShininess_3D = c.default_atoms_materialShininess_3D;
  this.atoms_nonBondedAsStars_3D = c.default_atoms_nonBondedAsStars_3D;
  this.atoms_displayLabels_3D = c.default_atoms_displayLabels_3D;

  // bond properties
  this.bonds_display = c.default_bonds_display;
  this.bonds_color = c.default_bonds_color;
  this.bonds_width_2D = c.default_bonds_width_2D;
  this.bonds_useAbsoluteSaturationWidths_2D = c.default_bonds_useAbsoluteSaturationWidths_2D;
  this.bonds_saturationWidth_2D = c.default_bonds_saturationWidth_2D;
  this.bonds_saturationWidthAbs_2D = c.default_bonds_saturationWidthAbs_2D;
  this.bonds_ends_2D = c.default_bonds_ends_2D;
  this.bonds_splitColor = c.default_bonds_splitColor;
  this.bonds_colorGradient = c.default_bonds_colorGradient;
  this.bonds_saturationAngle_2D = c.default_bonds_saturationAngle_2D;
  this.bonds_symmetrical_2D = c.default_bonds_symmetrical_2D;
  this.bonds_clearOverlaps_2D = c.default_bonds_clearOverlaps_2D;
  this.bonds_overlapClearWidth_2D = c.default_bonds_overlapClearWidth_2D;
  this.bonds_atomLabelBuffer_2D = c.default_bonds_atomLabelBuffer_2D;
  this.bonds_wedgeThickness_2D = c.default_bonds_wedgeThickness_2D;
  this.bonds_wavyLength_2D = c.default_bonds_wavyLength_2D;
  this.bonds_hashWidth_2D = c.default_bonds_hashWidth_2D;
  this.bonds_hashSpacing_2D = c.default_bonds_hashSpacing_2D;
  this.bonds_dotSize_2D = c.default_bonds_dotSize_2D;
  this.bonds_lewisStyle_2D = c.default_bonds_lewisStyle_2D;
  this.bonds_showBondOrders_3D = c.default_bonds_showBondOrders_3D;
  this.bonds_resolution_3D = c.default_bonds_resolution_3D;
  this.bonds_renderAsLines_3D = c.default_bonds_renderAsLines_3D;
  this.bonds_cylinderDiameter_3D = c.default_bonds_cylinderDiameter_3D;
  this.bonds_pillHeight_3D = c.default_bonds_pillHeight_3D;
  this.bonds_pillLatitudeResolution_3D = c.default_bonds_pillLatitudeResolution_3D;
  this.bonds_pillLongitudeResolution_3D = c.default_bonds_pillLongitudeResolution_3D;
  this.bonds_pillSpacing_3D = c.default_bonds_pillSpacing_3D;
  this.bonds_pillDiameter_3D = c.default_bonds_pillDiameter_3D;
  this.bonds_materialAmbientColor_3D = c.default_bonds_materialAmbientColor_3D;
  this.bonds_materialSpecularColor_3D = c.default_bonds_materialSpecularColor_3D;
  this.bonds_materialShininess_3D = c.default_bonds_materialShininess_3D;

  // macromolecular properties
  this.proteins_displayRibbon = c.default_proteins_displayRibbon;
  this.proteins_displayBackbone = c.default_proteins_displayBackbone;
  this.proteins_backboneThickness = c.default_proteins_backboneThickness;
  this.proteins_backboneColor = c.default_proteins_backboneColor;
  this.proteins_ribbonCartoonize = c.default_proteins_ribbonCartoonize;
  this.proteins_residueColor = c.default_proteins_residueColor;
  this.proteins_primaryColor = c.default_proteins_primaryColor;
  this.proteins_secondaryColor = c.default_proteins_secondaryColor;
  this.proteins_ribbonCartoonHelixPrimaryColor = c.default_proteins_ribbonCartoonHelixPrimaryColor;
  this.proteins_ribbonCartoonHelixSecondaryColor = c.default_proteins_ribbonCartoonHelixSecondaryColor;
  this.proteins_tubeColor = c.default_proteins_tubeColor;
  this.proteins_tubeResolution_3D = c.default_proteins_tubeResolution_3D;
  this.proteins_displayPipePlank = c.default_proteins_displayPipePlank;
  this.proteins_ribbonCartoonSheetColor = c.default_proteins_ribbonCartoonSheetColor;
  this.proteins_ribbonThickness = c.default_proteins_ribbonThickness;
  this.proteins_tubeThickness = c.default_proteins_tubeThickness;
  this.proteins_plankSheetWidth = c.default_proteins_plankSheetWidth;
  this.proteins_cylinderHelixDiameter = c.default_proteins_cylinderHelixDiameter;
  this.proteins_verticalResolution = c.default_proteins_verticalResolution;
  this.proteins_horizontalResolution = c.default_proteins_horizontalResolution;
  this.proteins_materialAmbientColor_3D = c.default_proteins_materialAmbientColor_3D;
  this.proteins_materialSpecularColor_3D = c.default_proteins_materialSpecularColor_3D;
  this.proteins_materialShininess_3D = c.default_proteins_materialShininess_3D;
  this.macro_displayAtoms = c.default_macro_displayAtoms;
  this.macro_displayBonds = c.default_macro_displayBonds;
  this.macro_atomToLigandDistance = c.default_macro_atomToLigandDistance;
  this.nucleics_display = c.default_nucleics_display;
  this.nucleics_tubeColor = c.default_nucleics_tubeColor;
  this.nucleics_baseColor = c.default_nucleics_baseColor;
  this.nucleics_residueColor = c.default_nucleics_residueColor;
  this.nucleics_tubeThickness = c.default_nucleics_tubeThickness;
  this.nucleics_tubeResolution_3D = c.default_nucleics_tubeResolution_3D;
  this.nucleics_verticalResolution = c.default_nucleics_verticalResolution;
  this.nucleics_materialAmbientColor_3D = c.default_nucleics_materialAmbientColor_3D;
  this.nucleics_materialSpecularColor_3D = c.default_nucleics_materialSpecularColor_3D;
  this.nucleics_materialShininess_3D = c.default_nucleics_materialShininess_3D;
  this.macro_showWater = c.default_macro_showWater;
  this.macro_colorByChain = c.default_macro_colorByChain;
  this.macro_rainbowColors = c.default_macro_rainbowColors.slice(0);

  // surface properties
  this.surfaces_display = c.default_surfaces_display;
  this.surfaces_alpha = c.default_surfaces_alpha;
  this.surfaces_style = c.default_surfaces_style;
  this.surfaces_color = c.default_surfaces_color;
  this.surfaces_materialAmbientColor_3D = c.default_surfaces_materialAmbientColor_3D;
  this.surfaces_materialSpecularColor_3D = c.default_surfaces_materialSpecularColor_3D;
  this.surfaces_materialShininess_3D = c.default_surfaces_materialShininess_3D;

  // spectrum properties
  this.plots_color = c.default_plots_color;
  this.plots_width = c.default_plots_width;
  this.plots_showIntegration = c.default_plots_showIntegration;
  this.plots_integrationColor = c.default_plots_integrationColor;
  this.plots_integrationLineWidth = c.default_plots_integrationLineWidth;
  this.plots_showGrid = c.default_plots_showGrid;
  this.plots_gridColor = c.default_plots_gridColor;
  this.plots_gridLineWidth = c.default_plots_gridLineWidth;
  this.plots_showYAxis = c.default_plots_showYAxis;
  this.plots_flipXAxis = c.default_plots_flipXAxis;

  // shape properties
  this.text_font_size = c.default_text_font_size;
  this.text_font_families = c.default_text_font_families.slice(0);
  this.text_font_bold = c.default_text_font_bold;
  this.text_font_italic = c.default_text_font_italic;
  this.text_font_stroke_3D = c.default_text_font_stroke_3D;
  this.text_color = c.default_text_color;
  this.shapes_color = c.default_shapes_color;
  this.shapes_lineWidth = c.default_shapes_lineWidth;
  this.shapes_pointSize = c.default_shapes_pointSize;
  this.shapes_arrowLength_2D = c.default_shapes_arrowLength_2D;
  this.compass_display = c.default_compass_display;
  this.compass_axisXColor_3D = c.default_compass_axisXColor_3D;
  this.compass_axisYColor_3D = c.default_compass_axisYColor_3D;
  this.compass_axisZColor_3D = c.default_compass_axisZColor_3D;
  this.compass_size_3D = c.default_compass_size_3D;
  this.compass_resolution_3D = c.default_compass_resolution_3D;
  this.compass_displayText_3D = c.default_compass_displayText_3D;
  this.compass_type_3D = c.default_compass_type_3D;
  this.measurement_update_3D = c.default_measurement_update_3D;
  this.measurement_angleBands_3D = c.default_measurement_angleBands_3D;
  this.measurement_displayText_3D = c.default_measurement_displayText_3D;
};
var _ = VisualSpecifications.prototype;
_.set3DRepresentation = function(representation) {
  this.atoms_display = true;
  this.bonds_display = true;
  this.bonds_color = '#777777';
  this.atoms_useVDWDiameters_3D = true;
  this.atoms_useJMOLColors = true;
  this.bonds_splitColor = true;
  this.bonds_showBondOrders_3D = true;
  this.bonds_renderAsLines_3D = false;
  if (representation === 'Ball and Stick') {
    this.atoms_vdwMultiplier_3D = .3;
    this.bonds_splitColor = false;
    this.bonds_cylinderDiameter_3D = .3;
    this.bonds_materialAmbientColor_3D = c.default_atoms_materialAmbientColor_3D;
    this.bonds_pillDiameter_3D = .15;
  } else if (representation === 'van der Waals Spheres') {
    this.bonds_display = false;
    this.atoms_vdwMultiplier_3D = 1;
  } else if (representation === 'Stick') {
    this.atoms_useVDWDiameters_3D = false;
    this.bonds_showBondOrders_3D = false;
    this.bonds_cylinderDiameter_3D = this.atoms_sphereDiameter_3D = .8;
    this.bonds_materialAmbientColor_3D = this.atoms_materialAmbientColor_3D;
  } else if (representation === 'Wireframe') {
    this.atoms_useVDWDiameters_3D = false;
    this.bonds_cylinderDiameter_3D = this.bonds_pillDiameter_3D = .05;
    this.atoms_sphereDiameter_3D = .15;
    this.bonds_materialAmbientColor_3D = c.default_atoms_materialAmbientColor_3D;
  } else if (representation === 'Line') {
    this.atoms_display = false;
    this.bonds_renderAsLines_3D = true;
    this.bonds_width_2D = 1;
    this.bonds_cylinderDiameter_3D = .05;
  } else {
    alert('"' + representation + '" is not recognized. Use one of the following strings:\n\n' + '1. Ball and Stick\n' + '2. van der Waals Spheres\n' + '3. Stick\n' + '4. Wireframe\n' + '5. Line\n');
  }
};
_.copy = function(){
  var copy = JSON.parse(JSON.stringify(this));
  copy.set3DRepresentation = _.set3DRepresentation;
  return copy;
};

import JSONInterpreter from './io/JSONInterpreter';
const m = Math;

const VERSION = '8.0.0';

export function getVersion() {
  return VERSION;
}

// all symbols
export const SYMBOLS = [ 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl',
		'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og' ];

export const ELEMENT = (function(SYMBOLS, undefined) {
	'use strict';
	var E = [];

	function Element(symbol, name, atomicNumber, addH, color, covalentRadius, vdWRadius, valency, mass) {
		this.symbol = symbol;
		this.name = name;
		this.atomicNumber = atomicNumber;
		this.addH = addH;
		this.jmolColor = this.pymolColor = color;
		this.covalentRadius = covalentRadius;
		this.vdWRadius = vdWRadius;
		this.valency = valency;
		this.mass = mass;
	}

	E.H = new Element('H', 'Hydrogen', 1, false, '#FFFFFF', 0.31, 1.1, 1, 1);
	E.He = new Element('He', 'Helium', 2, false, '#D9FFFF', 0.28, 1.4, 0, 4);
	E.Li = new Element('Li', 'Lithium', 3, false, '#CC80FF', 1.28, 1.82, 1, 7);
	E.Be = new Element('Be', 'Beryllium', 4, false, '#C2FF00', 0.96, 1.53, 2, 9);
	E.B = new Element('B', 'Boron', 5, true, '#FFB5B5', 0.84, 1.92, 3, 11);
	E.C = new Element('C', 'Carbon', 6, true, '#909090', 0.76, 1.7, 4, 12);
	E.N = new Element('N', 'Nitrogen', 7, true, '#3050F8', 0.71, 1.55, 3, 14);
	E.O = new Element('O', 'Oxygen', 8, true, '#FF0D0D', 0.66, 1.52, 2, 16);
	E.F = new Element('F', 'Fluorine', 9, true, '#90E050', 0.57, 1.47, 1, 19);
	E.Ne = new Element('Ne', 'Neon', 10, false, '#B3E3F5', 0.58, 1.54, 0, 20);
	E.Na = new Element('Na', 'Sodium', 11, false, '#AB5CF2', 1.66, 2.27, 1, 23);
	E.Mg = new Element('Mg', 'Magnesium', 12, false, '#8AFF00', 1.41, 1.73, 0, 24);
	E.Al = new Element('Al', 'Aluminum', 13, false, '#BFA6A6', 1.21, 1.84, 0, 27);
	E.Si = new Element('Si', 'Silicon', 14, true, '#F0C8A0', 1.11, 2.1, 4, 28);
	E.P = new Element('P', 'Phosphorus', 15, true, '#FF8000', 1.07, 1.8, 3, 31);
	E.S = new Element('S', 'Sulfur', 16, true, '#FFFF30', 1.05, 1.8, 2, 32);
	E.Cl = new Element('Cl', 'Chlorine', 17, true, '#1FF01F', 1.02, 1.75, 1, 35);
	E.Ar = new Element('Ar', 'Argon', 18, false, '#80D1E3', 1.06, 1.88, 0, 40);
	E.K = new Element('K', 'Potassium', 19, false, '#8F40D4', 2.03, 2.75, 0, 39);
	E.Ca = new Element('Ca', 'Calcium', 20, false, '#3DFF00', 1.76, 2.31, 0, 40);
	E.Sc = new Element('Sc', 'Scandium', 21, false, '#E6E6E6', 1.7, 0, 0, 45);
	E.Ti = new Element('Ti', 'Titanium', 22, false, '#BFC2C7', 1.6, 0, 1, 48);
	E.V = new Element('V', 'Vanadium', 23, false, '#A6A6AB', 1.53, 0, 1, 51);
	E.Cr = new Element('Cr', 'Chromium', 24, false, '#8A99C7', 1.39, 0, 2, 52);
	E.Mn = new Element('Mn', 'Manganese', 25, false, '#9C7AC7', 1.39, 0, 3, 55);
	E.Fe = new Element('Fe', 'Iron', 26, false, '#E06633', 1.32, 0, 2, 56);
	E.Co = new Element('Co', 'Cobalt', 27, false, '#F090A0', 1.26, 0, 1, 59);
	E.Ni = new Element('Ni', 'Nickel', 28, false, '#50D050', 1.24, 1.63, 1, 58);
	E.Cu = new Element('Cu', 'Copper', 29, false, '#C88033', 1.32, 1.4, 0, 63);
	E.Zn = new Element('Zn', 'Zinc', 30, false, '#7D80B0', 1.22, 1.39, 0, 64);
	E.Ga = new Element('Ga', 'Gallium', 31, false, '#C28F8F', 1.22, 1.87, 0, 69);
	E.Ge = new Element('Ge', 'Germanium', 32, false, '#668F8F', 1.2, 2.11, 4, 74);
	E.As = new Element('As', 'Arsenic', 33, true, '#BD80E3', 1.19, 1.85, 3, 75);
	E.Se = new Element('Se', 'Selenium', 34, true, '#FFA100', 1.2, 1.9, 2, 80);
	E.Br = new Element('Br', 'Bromine', 35, true, '#A62929', 1.2, 1.85, 1, 79);
	E.Kr = new Element('Kr', 'Krypton', 36, false, '#5CB8D1', 1.16, 2.02, 0, 84);
	E.Rb = new Element('Rb', 'Rubidium', 37, false, '#702EB0', 2.2, 3.03, 0, 85);
	E.Sr = new Element('Sr', 'Strontium', 38, false, '#00FF00', 1.95, 2.49, 0, 88);
	E.Y = new Element('Y', 'Yttrium', 39, false, '#94FFFF', 1.9, 0, 0, 89);
	E.Zr = new Element('Zr', 'Zirconium', 40, false, '#94E0E0', 1.75, 0, 0, 90);
	E.Nb = new Element('Nb', 'Niobium', 41, false, '#73C2C9', 1.64, 0, 1, 93);
	E.Mo = new Element('Mo', 'Molybdenum', 42, false, '#54B5B5', 1.54, 0, 2, 98);
	E.Tc = new Element('Tc', 'Technetium', 43, false, '#3B9E9E', 1.47, 0, 3, 0);
	E.Ru = new Element('Ru', 'Ruthenium', 44, false, '#248F8F', 1.46, 0, 2, 102);
	E.Rh = new Element('Rh', 'Rhodium', 45, false, '#0A7D8C', 1.42, 0, 1, 103);
	E.Pd = new Element('Pd', 'Palladium', 46, false, '#006985', 1.39, 1.63, 0, 106);
	E.Ag = new Element('Ag', 'Silver', 47, false, '#C0C0C0', 1.45, 1.72, 0, 107);
	E.Cd = new Element('Cd', 'Cadmium', 48, false, '#FFD98F', 1.44, 1.58, 0, 114);
	E.In = new Element('In', 'Indium', 49, false, '#A67573', 1.42, 1.93, 0, 115);
	E.Sn = new Element('Sn', 'Tin', 50, false, '#668080', 1.39, 2.17, 4, 120);
	E.Sb = new Element('Sb', 'Antimony', 51, false, '#9E63B5', 1.39, 2.06, 3, 121);
	E.Te = new Element('Te', 'Tellurium', 52, true, '#D47A00', 1.38, 2.06, 2, 130);
	E.I = new Element('I', 'Iodine', 53, true, '#940094', 1.39, 1.98, 1, 127);
	E.Xe = new Element('Xe', 'Xenon', 54, false, '#429EB0', 1.4, 2.16, 0, 132);
	E.Cs = new Element('Cs', 'Cesium', 55, false, '#57178F', 2.44, 3.43, 0, 133);
	E.Ba = new Element('Ba', 'Barium', 56, false, '#00C900', 2.15, 2.68, 0, 138);
	E.La = new Element('La', 'Lanthanum', 57, false, '#70D4FF', 2.07, 0, 0, 139);
	E.Ce = new Element('Ce', 'Cerium', 58, false, '#FFFFC7', 2.04, 0, 0, 140);
	E.Pr = new Element('Pr', 'Praseodymium', 59, false, '#D9FFC7', 2.03, 0, 0, 141);
	E.Nd = new Element('Nd', 'Neodymium', 60, false, '#C7FFC7', 2.01, 0, 0, 142);
	E.Pm = new Element('Pm', 'Promethium', 61, false, '#A3FFC7', 1.99, 0, 0, 0);
	E.Sm = new Element('Sm', 'Samarium', 62, false, '#8FFFC7', 1.98, 0, 0, 152);
	E.Eu = new Element('Eu', 'Europium', 63, false, '#61FFC7', 1.98, 0, 0, 153);
	E.Gd = new Element('Gd', 'Gadolinium', 64, false, '#45FFC7', 1.96, 0, 0, 158);
	E.Tb = new Element('Tb', 'Terbium', 65, false, '#30FFC7', 1.94, 0, 0, 159);
	E.Dy = new Element('Dy', 'Dysprosium', 66, false, '#1FFFC7', 1.92, 0, 0, 164);
	E.Ho = new Element('Ho', 'Holmium', 67, false, '#00FF9C', 1.92, 0, 0, 165);
	E.Er = new Element('Er', 'Erbium', 68, false, '#00E675', 1.89, 0, 0, 166);
	E.Tm = new Element('Tm', 'Thulium', 69, false, '#00D452', 1.9, 0, 0, 169);
	E.Yb = new Element('Yb', 'Ytterbium', 70, false, '#00BF38', 1.87, 0, 0, 174);
	E.Lu = new Element('Lu', 'Lutetium', 71, false, '#00AB24', 1.87, 0, 0, 175);
	E.Hf = new Element('Hf', 'Hafnium', 72, false, '#4DC2FF', 1.75, 0, 0, 180);
	E.Ta = new Element('Ta', 'Tantalum', 73, false, '#4DA6FF', 1.7, 0, 1, 181);
	E.W = new Element('W', 'Tungsten', 74, false, '#2194D6', 1.62, 0, 2, 184);
	E.Re = new Element('Re', 'Rhenium', 75, false, '#267DAB', 1.51, 0, 3, 187);
	E.Os = new Element('Os', 'Osmium', 76, false, '#266696', 1.44, 0, 2, 192);
	E.Ir = new Element('Ir', 'Iridium', 77, false, '#175487', 1.41, 0, 3, 193);
	E.Pt = new Element('Pt', 'Platinum', 78, false, '#D0D0E0', 1.36, 1.75, 0, 195);
	E.Au = new Element('Au', 'Gold', 79, false, '#FFD123', 1.36, 1.66, 1, 197);
	E.Hg = new Element('Hg', 'Mercury', 80, false, '#B8B8D0', 1.32, 1.55, 0, 202);
	E.Tl = new Element('Tl', 'Thallium', 81, false, '#A6544D', 1.45, 1.96, 0, 205);
	E.Pb = new Element('Pb', 'Lead', 82, false, '#575961', 1.46, 2.02, 4, 208);
	E.Bi = new Element('Bi', 'Bismuth', 83, false, '#9E4FB5', 1.48, 2.07, 3, 209);
	E.Po = new Element('Po', 'Polonium', 84, false, '#AB5C00', 1.4, 1.97, 2, 0);
	E.At = new Element('At', 'Astatine', 85, true, '#754F45', 1.5, 2.02, 1, 0);
	E.Rn = new Element('Rn', 'Radon', 86, false, '#428296', 1.5, 2.2, 0, 0);
	E.Fr = new Element('Fr', 'Francium', 87, false, '#420066', 2.6, 3.48, 0, 0);
	E.Ra = new Element('Ra', 'Radium', 88, false, '#007D00', 2.21, 2.83, 0, 0);
	E.Ac = new Element('Ac', 'Actinium', 89, false, '#70ABFA', 2.15, 0, 0, 0);
	E.Th = new Element('Th', 'Thorium', 90, false, '#00BAFF', 2.06, 0, 0, 232);
	E.Pa = new Element('Pa', 'Protactinium', 91, false, '#00A1FF', 2, 0, 0, 231);
	E.U = new Element('U', 'Uranium', 92, false, '#008FFF', 1.96, 1.86, 0, 238);
	E.Np = new Element('Np', 'Neptunium', 93, false, '#0080FF', 1.9, 0, 0, 0);
	E.Pu = new Element('Pu', 'Plutonium', 94, false, '#006BFF', 1.87, 0, 0, 0);
	E.Am = new Element('Am', 'Americium', 95, false, '#545CF2', 1.8, 0, 0, 0);
	E.Cm = new Element('Cm', 'Curium', 96, false, '#785CE3', 1.69, 0, 0, 0);
	E.Bk = new Element('Bk', 'Berkelium', 97, false, '#8A4FE3', 0, 0, 0, 0);
	E.Cf = new Element('Cf', 'Californium', 98, false, '#A136D4', 0, 0, 0, 0);
	E.Es = new Element('Es', 'Einsteinium', 99, false, '#B31FD4', 0, 0, 0, 0);
	E.Fm = new Element('Fm', 'Fermium', 100, false, '#B31FBA', 0, 0, 0, 0);
	E.Md = new Element('Md', 'Mendelevium', 101, false, '#B30DA6', 0, 0, 0, 0);
	E.No = new Element('No', 'Nobelium', 102, false, '#BD0D87', 0, 0, 0, 0);
	E.Lr = new Element('Lr', 'Lawrencium', 103, false, '#C70066', 0, 0, 0, 0);
	E.Rf = new Element('Rf', 'Rutherfordium', 104, false, '#CC0059', 0, 0, 0, 0);
	E.Db = new Element('Db', 'Dubnium', 105, false, '#D1004F', 0, 0, 0, 0);
	E.Sg = new Element('Sg', 'Seaborgium', 106, false, '#D90045', 0, 0, 0, 0);
	E.Bh = new Element('Bh', 'Bohrium', 107, false, '#E00038', 0, 0, 0, 0);
	E.Hs = new Element('Hs', 'Hassium', 108, false, '#E6002E', 0, 0, 0, 0);
	E.Mt = new Element('Mt', 'Meitnerium', 109, false, '#EB0026', 0, 0, 0, 0);
	E.Ds = new Element('Ds', 'Darmstadtium', 110, false, '#000000', 0, 0, 0, 0);
	E.Rg = new Element('Rg', 'Roentgenium', 111, false, '#000000', 0, 0, 0, 0);
	E.Cn = new Element('Cn', 'Copernicium', 112, false, '#000000', 0, 0, 0, 0);
	E.Nh = new Element('Nh', 'Nihonium', 113, false, '#000000', 0, 0, 0, 0);
	E.Fl = new Element('Fl', 'Flerovium', 114, false, '#000000', 0, 0, 0, 0);
	E.Mc = new Element('Mc', 'Moscovium', 115, false, '#000000', 0, 0, 0, 0);
	E.Lv = new Element('Lv', 'Livermorium', 116, false, '#000000', 0, 0, 0, 0);
	E.Ts = new Element('Ts', 'Tennessine', 117, false, '#000000', 0, 0, 0, 0);
	E.Og = new Element('Og', 'Oganesson', 118, false, '#000000', 0, 0, 0, 0);

	E.H.pymolColor = '#E6E6E6';
	E.C.pymolColor = '#33FF33';
	E.N.pymolColor = '#3333FF';
	E.O.pymolColor = '#FF4D4D';
	E.F.pymolColor = '#B3FFFF';
	E.S.pymolColor = '#E6C640';

	return E;

})(SYMBOLS);

export const RESIDUE = (function(undefined) {
	'use strict';
	var R = [];

	function Residue(symbol, name, polar, aminoColor, shapelyColor, acidity) {
		this.symbol = symbol;
		this.name = name;
		this.polar = polar;
		this.aminoColor = aminoColor;
		this.shapelyColor = shapelyColor;
		this.acidity = acidity;
	}

	R.Ala = new Residue('Ala', 'Alanine', false, '#C8C8C8', '#8CFF8C', 0);
	R.Arg = new Residue('Arg', 'Arginine', true, '#145AFF', '#00007C', 1);
	R.Asn = new Residue('Asn', 'Asparagine', true, '#00DCDC', '#FF7C70', 0);
	R.Asp = new Residue('Asp', 'Aspartic Acid', true, '#E60A0A', '#A00042', -1);
	R.Cys = new Residue('Cys', 'Cysteine', true, '#E6E600', '#FFFF70', 0);
	R.Gln = new Residue('Gln', 'Glutamine', true, '#00DCDC', '#FF4C4C', 0);
	R.Glu = new Residue('Glu', 'Glutamic Acid', true, '#E60A0A', '#660000', -1);
	R.Gly = new Residue('Gly', 'Glycine', false, '#EBEBEB', '#FFFFFF', 0);
	R.His = new Residue('His', 'Histidine', true, '#8282D2', '#7070FF', 1);
	R.Ile = new Residue('Ile', 'Isoleucine', false, '#0F820F', '#004C00', 0);
	R.Leu = new Residue('Leu', 'Leucine', false, '#0F820F', '#455E45', 0);
	R.Lys = new Residue('Lys', 'Lysine', true, '#145AFF', '#4747B8', 1);
	R.Met = new Residue('Met', 'Methionine', false, '#E6E600', '#B8A042', 0);
	R.Phe = new Residue('Phe', 'Phenylalanine', false, '#3232AA', '#534C52', 0);
	R.Pro = new Residue('Pro', 'Proline', false, '#DC9682', '#525252', 0);
	R.Ser = new Residue('Ser', 'Serine', true, '#FA9600', '#FF7042', 0);
	R.Thr = new Residue('Thr', 'Threonine', true, '#FA9600', '#B84C00', 0);
	R.Trp = new Residue('Trp', 'Tryptophan', true, '#B45AB4', '#4F4600', 0);
	R.Tyr = new Residue('Tyr', 'Tyrosine', true, '#3232AA', '#8C704C', 0);
	R.Val = new Residue('Val', 'Valine', false, '#0F820F', '#FF8CFF', 0);
	R.Asx = new Residue('Asx', 'Asparagine/Aspartic Acid', true, '#FF69B4', '#FF00FF', 0);
	R.Glx = new Residue('Glx', 'Glutamine/Glutamic Acid', true, '#FF69B4', '#FF00FF', 0);
	R['*'] = new Residue('*', 'Other', false, '#BEA06E', '#FF00FF', 0);
	R.A = new Residue('A', 'Adenine', false, '#BEA06E', '#A0A0FF', 0);
	R.G = new Residue('G', 'Guanine', false, '#BEA06E', '#FF7070', 0);
	R.I = new Residue('I', '', false, '#BEA06E', '#80FFFF', 0);
	R.C = new Residue('C', 'Cytosine', false, '#BEA06E', '#FF8C4B', 0);
	R.T = new Residue('T', 'Thymine', false, '#BEA06E', '#A0FFA0', 0);
	R.U = new Residue('U', 'Uracil', false, '#BEA06E', '#FF8080', 0);

	return R;

})();

// default canvas properties
export const default_backgroundColor = '#FFFFFF';
export const default_scale = 1;
export const default_rotateAngle = 0;
export const default_bondLength_2D = 20;
export const default_angstromsPerBondLength = 1.25;
export const default_lightDirection_3D = [ -.1, -.1, -1 ];
export const default_lightDiffuseColor_3D = '#FFFFFF';
export const default_lightSpecularColor_3D = '#FFFFFF';
export const default_projectionPerspective_3D = true;
export const default_projectionPerspectiveVerticalFieldOfView_3D = 45;
export const default_projectionOrthoWidth_3D = 40;
export const default_projectionWidthHeightRatio_3D = undefined;
export const default_projectionFrontCulling_3D = .1;
export const default_projectionBackCulling_3D = 10000;
export const default_cullBackFace_3D = true;
export const default_fog_mode_3D = 0;
export const default_fog_color_3D = '#000000';
export const default_fog_start_3D = 0;
export const default_fog_end_3D = 1;
export const default_fog_density_3D = 1;
export const default_shadow_3D = false;
export const default_shadow_intensity_3D = .85;
export const default_flat_color_3D = false;
export const default_antialias_3D = true;
export const default_gammaCorrection_3D = 2.2;
export const default_colorHover = '#885110';
export const default_colorSelect = '#0060B2';
export const default_colorError = '#c10000';
export const default_colorPreview = '#00FF00';

// 3D shaders
// default ssao
export const default_ssao_3D = false;
export const default_ssao_kernel_radius = 17;
export const default_ssao_kernel_samples = 32;
export const default_ssao_power = 1.0;
// default outline 3D
export const default_outline_3D = false;
export const default_outline_thickness = 1.0;
export const default_outline_normal_threshold = 0.85;
export const default_outline_depth_threshold = 0.1;
// defult fxaa antialiasing
export const default_fxaa_edgeThreshold = 1.0/16.0;
export const default_fxaa_edgeThresholdMin = 1.0/12.0;
export const default_fxaa_searchSteps = 64;
export const default_fxaa_searchThreshold = 1.0/4.0;
export const default_fxaa_subpixCap = 1.0;
export const default_fxaa_subpixTrim = 0.0;

// default atom properties
export const default_atoms_display = true;
export const default_atoms_color = '#000000';
export const default_atoms_font_size_2D = 12;
export const default_atoms_font_families_2D = [ 'Helvetica', 'Arial', 'Dialog' ];
export const default_atoms_font_bold_2D = false;
export const default_atoms_font_italic_2D = false;
export const default_atoms_circles_2D = false;
export const default_atoms_circleDiameter_2D = 10;
export const default_atoms_circleBorderWidth_2D = 1;
export const default_atoms_lonePairDistance_2D = 8;
export const default_atoms_lonePairSpread_2D = 4;
export const default_atoms_lonePairDiameter_2D = 1;
export const default_atoms_useJMOLColors = false;
export const default_atoms_usePYMOLColors = false;
export const default_atoms_HBlack_2D = true;
export const default_atoms_implicitHydrogens_2D = true;
export const default_atoms_displayTerminalCarbonLabels_2D = false;
export const default_atoms_showHiddenCarbons_2D = true;
export const default_atoms_showAttributedCarbons_2D = true;
export const default_atoms_displayAllCarbonLabels_2D = false;
export const default_atoms_resolution_3D = 30;
export const default_atoms_sphereDiameter_3D = .8;
export const default_atoms_useVDWDiameters_3D = false;
export const default_atoms_vdwMultiplier_3D = 1;
export const default_atoms_materialAmbientColor_3D = '#000000';
export const default_atoms_materialSpecularColor_3D = '#555555';
export const default_atoms_materialShininess_3D = 32;
export const default_atoms_nonBondedAsStars_3D = false;
export const default_atoms_displayLabels_3D = false;

// default bond properties
export const default_bonds_display = true;
export const default_bonds_color = '#000000';
export const default_bonds_width_2D = 1;
export const default_bonds_useAbsoluteSaturationWidths_2D = true;
export const default_bonds_saturationWidth_2D = .2;
export const default_bonds_saturationWidthAbs_2D = 5;
export const default_bonds_ends_2D = 'round';
export const default_bonds_splitColor = false;
export const default_bonds_colorGradient = false;
export const default_bonds_saturationAngle_2D = m.PI / 3;
export const default_bonds_symmetrical_2D = false;
export const default_bonds_clearOverlaps_2D = false;
export const default_bonds_overlapClearWidth_2D = .5;
export const default_bonds_atomLabelBuffer_2D = 1;
export const default_bonds_wedgeThickness_2D = 6;
export const default_bonds_wavyLength_2D = 4;
export const default_bonds_hashWidth_2D = 1;
export const default_bonds_hashSpacing_2D = 2.5;
export const default_bonds_dotSize_2D = 2;
export const default_bonds_lewisStyle_2D = false;
export const default_bonds_showBondOrders_3D = false;
export const default_bonds_resolution_3D = 30;
export const default_bonds_renderAsLines_3D = false;
export const default_bonds_cylinderDiameter_3D = .3;
export const default_bonds_pillLatitudeResolution_3D = 10;
export const default_bonds_pillLongitudeResolution_3D = 20;
export const default_bonds_pillHeight_3D = .3;
export const default_bonds_pillSpacing_3D = .1;
export const default_bonds_pillDiameter_3D = .3;
export const default_bonds_materialAmbientColor_3D = '#000000';
export const default_bonds_materialSpecularColor_3D = '#555555';
export const default_bonds_materialShininess_3D = 32;

// default macromolecular properties
export const default_proteins_displayRibbon = true;
export const default_proteins_displayBackbone = false;
export const default_proteins_backboneThickness = 1.5;
export const default_proteins_backboneColor = '#CCCCCC';
export const default_proteins_ribbonCartoonize = false;
export const default_proteins_displayPipePlank = false;
// shapely, amino, polarity, rainbow, acidity
export const default_proteins_residueColor = 'none';
export const default_proteins_primaryColor = '#FF0D0D';
export const default_proteins_secondaryColor = '#FFFF30';
export const default_proteins_ribbonCartoonHelixPrimaryColor = '#00E740';
export const default_proteins_ribbonCartoonHelixSecondaryColor = '#9905FF';
export const default_proteins_ribbonCartoonSheetColor = '#E8BB99';
export const default_proteins_tubeColor = '#FF0D0D';
export const default_proteins_tubeResolution_3D = 15;
export const default_proteins_ribbonThickness = .2;
export const default_proteins_tubeThickness = 0.5;
export const default_proteins_plankSheetWidth = 3.5;
export const default_proteins_cylinderHelixDiameter = 4;
export const default_proteins_verticalResolution = 8;
export const default_proteins_horizontalResolution = 8;
export const default_proteins_materialAmbientColor_3D = '#000000';
export const default_proteins_materialSpecularColor_3D = '#555555';
export const default_proteins_materialShininess_3D = 32;
export const default_nucleics_display = true;
export const default_nucleics_tubeColor = '#CCCCCC';
export const default_nucleics_baseColor = '#C10000';
// shapely, rainbow
export const default_nucleics_residueColor = 'none';
export const default_nucleics_tubeThickness = 1.5;
export const default_nucleics_tubeResolution_3D = 15;
export const default_nucleics_verticalResolution = 8;
export const default_nucleics_materialAmbientColor_3D = '#000000';
export const default_nucleics_materialSpecularColor_3D = '#555555';
export const default_nucleics_materialShininess_3D = 32;
export const default_macro_displayAtoms = false;
export const default_macro_displayBonds = false;
export const default_macro_atomToLigandDistance = -1;
export const default_macro_showWater = false;
export const default_macro_colorByChain = false;
export const default_macro_rainbowColors = ['#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000'];

// default surface properties
export const default_surfaces_display = true;
export const default_surfaces_alpha = .5;
export const default_surfaces_style = 'Solid';
export const default_surfaces_color = 'white';
export const default_surfaces_materialAmbientColor_3D = '#000000';
export const default_surfaces_materialSpecularColor_3D = '#000000';
export const default_surfaces_materialShininess_3D = 32;

// default spectrum properties
export const default_plots_color = '#000000';
export const default_plots_width = 1;
export const default_plots_showIntegration = false;
export const default_plots_integrationColor = '#c10000';
export const default_plots_integrationLineWidth = 1;
export const default_plots_showGrid = false;
export const default_plots_gridColor = 'gray';
export const default_plots_gridLineWidth = .5;
export const default_plots_showYAxis = true;
export const default_plots_flipXAxis = false;

// default shape properties
export const default_text_font_size = 12;
export const default_text_font_families = [ 'Helvetica', 'Arial', 'Dialog' ];
export const default_text_font_bold = true;
export const default_text_font_italic = false;
export const default_text_font_stroke_3D = true;
export const default_text_color = '#000000';
export const default_shapes_color = '#000000';
export const default_shapes_lineWidth = 1;
export const default_shapes_pointSize = 2;
export const default_shapes_arrowLength_2D = 8;
export const default_compass_display = false;
export const default_compass_axisXColor_3D = '#FF0000';
export const default_compass_axisYColor_3D = '#00FF00';
export const default_compass_axisZColor_3D = '#0000FF';
export const default_compass_size_3D = 50;
export const default_compass_resolution_3D = 10;
export const default_compass_displayText_3D = true;
export const default_compass_type_3D = 0;
export const default_measurement_update_3D = false;
export const default_measurement_angleBands_3D = 10;
export const default_measurement_displayText_3D = true;

// shortcuts
var interpreter = new JSONInterpreter();
export function readJSON(string) {
  var obj;
  try {
    obj = JSON.parse(string);
  } catch (e) {
    // not json
    return undefined;
  }
  if (obj) {
    if (obj.m || obj.s) {
      return interpreter.contentFrom(obj);
    } else if (obj.a) {
      return obj = {
        molecules : [ interpreter.molFrom(obj) ],
        shapes : []
      };
    } else {
      return obj = {
        molecules : [],
        shapes : []
      };
    }
  }
  return undefined;
};

export function writeJSON(mols, shapes) {
  return JSON.stringify(interpreter.contentTo(mols, shapes));
};

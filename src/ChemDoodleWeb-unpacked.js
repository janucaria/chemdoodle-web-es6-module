//
// ChemDoodle Web Components 8.0.0
//
// http://web.chemdoodle.com
//
// Copyright 2009-2017 iChemLabs, LLC.  All rights reserved.
//
// The ChemDoodle Web Components library is licensed under version 3
// of the GNU GENERAL PUBLIC LICENSE.
//
// You may redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// Please contact iChemLabs <http://www.ichemlabs.com/contact-us> for
// alternate licensing options.
//

import * as lib from './ChemDoodle/lib';
import * as extensions from './ChemDoodle/extensions';
import * as structures from './ChemDoodle/structures';
import * as math from './ChemDoodle/math';
import * as informatics from './ChemDoodle/informatics';
import * as io from './ChemDoodle/io';
import animations from './ChemDoodle/animations';
import featureDetection from './ChemDoodle/featureDetection';
import monitor from './ChemDoodle/monitor';
import iChemLabs from './ChemDoodle/iChemLabs';
import * as ChemDoodleWeb from './ChemDoodle';

export var ChemDoodle = ChemDoodleWeb;

ChemDoodle.iChemLabs = iChemLabs;

ChemDoodle.informatics = informatics;

ChemDoodle.io = io;

ChemDoodle.lib = lib;

ChemDoodle.notations = {};

ChemDoodle.structures = structures;

ChemDoodle.animations = animations;

ChemDoodle.extensions = extensions;

ChemDoodle.math = math;

ChemDoodle.featureDetection = featureDetection;

ChemDoodle.monitor = monitor;

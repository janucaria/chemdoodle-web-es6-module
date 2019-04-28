import Point from '../Point';
import Atom from '../Atom';
import Residue from '../Residue';
import { ELEMENT, RESIDUE } from '../../../ChemDoodle';
import * as extensions from '../../extensions';
import * as math from '../../math';
import {
  mat3 as m3,
  mat4 as m4,
  vec3 as v3,
  MarchingCubes
} from '../../lib';

const m = Math;

export let d3 = {};

(function(d3, m, undefined) {
	'use strict';
	d3._Mesh = function() {
	};
	var _ = d3._Mesh.prototype;
	_.storeData = function(positionData, normalData, indexData) {
		this.positionData = positionData;
		this.normalData = normalData;
		this.indexData = indexData;
	};
	_.setupBuffers = function(gl) {
		this.vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData), gl.STATIC_DRAW);
		this.vertexPositionBuffer.itemSize = 3;
		this.vertexPositionBuffer.numItems = this.positionData.length / 3;

		this.vertexNormalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData), gl.STATIC_DRAW);
		this.vertexNormalBuffer.itemSize = 3;
		this.vertexNormalBuffer.numItems = this.normalData.length / 3;

		if (this.indexData) {
			this.vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indexData), gl.STATIC_DRAW);
			this.vertexIndexBuffer.itemSize = 1;
			this.vertexIndexBuffer.numItems = this.indexData.length;
		}

		if (this.partitions) {
			for ( var i = 0, ii = this.partitions.length; i < ii; i++) {
				var p = this.partitions[i];
				var buffers = this.generateBuffers(gl, p.positionData, p.normalData, p.indexData);
				p.vertexPositionBuffer = buffers[0];
				p.vertexNormalBuffer = buffers[1];
				p.vertexIndexBuffer = buffers[2];
			}
		}
	};
	_.generateBuffers = function(gl, positionData, normalData, indexData) {
		var vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.STATIC_DRAW);
		vertexPositionBuffer.itemSize = 3;
		vertexPositionBuffer.numItems = positionData.length / 3;

		var vertexNormalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
		vertexNormalBuffer.itemSize = 3;
		vertexNormalBuffer.numItems = normalData.length / 3;

		var vertexIndexBuffer;
		if (indexData) {
			vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
			vertexIndexBuffer.itemSize = 1;
			vertexIndexBuffer.numItems = indexData.length;
		}

		return [ vertexPositionBuffer, vertexNormalBuffer, vertexIndexBuffer ];
	};
	_.bindBuffers = function(gl) {
		if (!this.vertexPositionBuffer) {
			this.setupBuffers(gl);
		}
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		if (this.vertexIndexBuffer) {
			// indexes
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
		}
	};

})(d3, m);

(function(d3, undefined) {
	'use strict';
	d3._Measurement = function() {
	};
	var _ = d3._Measurement.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		// setting the vertex position buffer to undefined resets the buffers, so this shape can be dynamically updated with the molecule
		if(specs.measurement_update_3D){
			this.vertexPositionBuffer = undefined;
			this.text = undefined;
		}
		if(!this.vertexPositionBuffer){
			this.calculateData(specs);
		}
		this.bindBuffers(gl);
		// colors
		gl.material.setDiffuseColor(gl, specs.shapes_color);
		gl.lineWidth(specs.shapes_lineWidth);
		// render
		gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};
	_.renderText = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		// render the text
		if(!this.text){
			this.text = this.getText(specs);
		}
		
		var vertexData = {
			position : [],
			texCoord : [],
			translation : []
		};

		gl.textImage.pushVertexData(this.text.value, this.text.pos, 1, vertexData);
		gl.textMesh.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation);
		
		gl.textImage.useTexture(gl);
		gl.textMesh.render(gl);
	};

})(d3);

(function(ELEMENT, extensions, d3, math, m, m4, v3, undefined) {
	'use strict';
	d3.Angle = function(a1, a2, a3) {
		this.a1 = a1;
		this.a2 = a2;
		this.a3 = a3;
	};
	var _ = d3.Angle.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [];
		var normalData = [];
		var indexData = [];
		var dist1 = this.a2.distance3D(this.a1);
		var dist2 = this.a2.distance3D(this.a3);
		this.distUse = m.min(dist1, dist2) / 2;
		// data for the angle
		this.vec1 = v3.normalize([ this.a1.x - this.a2.x, this.a1.y - this.a2.y, this.a1.z - this.a2.z ]);
		this.vec2 = v3.normalize([ this.a3.x - this.a2.x, this.a3.y - this.a2.y, this.a3.z - this.a2.z ]);
		this.angle = extensions.vec3AngleFrom(this.vec1, this.vec2);

		var axis = v3.normalize(v3.cross(this.vec1, this.vec2, []));
		var vec3 = v3.normalize(v3.cross(axis, this.vec1, []));

		var bands = specs.measurement_angleBands_3D;
		for ( var i = 0; i <= bands; ++i) {
			var theta = this.angle * i / bands;
			var vecCos = v3.scale(this.vec1, m.cos(theta), []);
			var vecSin = v3.scale(vec3, m.sin(theta), []);
			var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

			positionData.push(this.a2.x + norm[0], this.a2.y + norm[1], this.a2.z + norm[2]);
			normalData.push(0, 0, 0);
			if (i < bands) {
				indexData.push(i, i + 1);
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		var vecCenter = v3.scale(v3.normalize(v3.add(this.vec1, this.vec2, [])), this.distUse + 0.3);
		return {
			pos : [ this.a2.x + vecCenter[0], this.a2.y + vecCenter[1], this.a2.z + vecCenter[2] ],
			value : [ math.angleBounds(this.angle, true).toFixed(2), ' \u00b0' ].join('')
		};
	};

})(ELEMENT, extensions, d3, math, m, m4, v3);

(function(d3, m, undefined) {
	'use strict';
	d3.Arrow = function(radius, longitudeBands) {
		var positionData = [];
		var normalData = [];

		for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
			var theta = longNumber * 2 * m.PI / longitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta);

			var x = cosTheta;
			var y = sinTheta;

			normalData.push(
			// base cylinder
			0, 0, -1, 0, 0, -1,
			// cylinder
			x, y, 0, x, y, 0,
			// base cone
			0, 0, -1, 0, 0, -1,
			// cone
			x, y, 1, x, y, 1);

			positionData.push(
			// base cylinder
			0, 0, 0, radius * x, radius * y, 0,
			// cylinder
			radius * x, radius * y, 0, radius * x, radius * y, 2,
			// base cone
			radius * x, radius * y, 2, radius * x * 2, radius * y * 2, 2,
			// cone
			radius * x * 2, radius * y * 2, 2, 0, 0, 3);
		}

		var indexData = [];
		for ( var i = 0; i < longitudeBands; i++) {
			var offset = i * 8;
			for ( var j = 0, jj = 7; j < jj; j++) {
				var first = j + offset;
				var second = first + 1;
				var third = first + jj + 2;
				var forth = third - 1;
				indexData.push(first, third, second, third, first, forth);
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Arrow.prototype = new d3._Mesh();

})(d3, m);

(function(d3, m, undefined) {
	'use strict';
	d3.Box = function(width, height, depth) {
		width /= 2;
		depth /= 2;

		var positionData = [];
		var normalData = [];

		// top
		positionData.push(width, height, -depth);
		positionData.push(width, height, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(width, height, depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, height, depth);
		for(var i = 6; i--; normalData.push(0 , 1, 0));

		// front
		positionData.push(-width, height, depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, 0, depth);
		positionData.push(width, height, depth);
		positionData.push(width, 0, depth);
		positionData.push(width, 0, depth);
		for(var i = 6; i--; normalData.push(0 , 0, 1));

		// right
		positionData.push(width, height, depth);
		positionData.push(width, height, depth);
		positionData.push(width, 0, depth);
		positionData.push(width, height, -depth);
		positionData.push(width, 0, -depth);
		positionData.push(width, 0, -depth);
		for(var i = 6; i--; normalData.push(1 , 0, 0));

		// back
		positionData.push(width, height, -depth);
		positionData.push(width, height, -depth);
		positionData.push(width, 0, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(-width, 0, -depth);
		positionData.push(-width, 0, -depth);
		for(var i = 6; i--; normalData.push(0 , 0, -1));

		// left
		positionData.push(-width, height, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(-width, 0, -depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, depth);
		for(var i = 6; i--; normalData.push(-1 , 0, 0));

		// bottom
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, -depth);
		positionData.push(width, 0, depth);
		positionData.push(width, 0, -depth);
		positionData.push(width, 0, -depth);
		for(var i = 6; i--; normalData.push(0 , -1, 0));

		this.storeData(positionData, normalData);
	};
	d3.Box.prototype = new d3._Mesh();

})(d3, m);

(function(math, d3, v3, m4, m, undefined) {
	'use strict';
	d3.Camera = function() {
		this.fieldOfView = 45;
		this.aspect = 1;
		this.near = 0.1;
		this.far = 10000;
		this.zoom = 1;
		this.viewMatrix = m4.identity([]);
		this.projectionMatrix = m4.identity([]);
	};
	var _ = d3.Camera.prototype;
	_.perspectiveProjectionMatrix = function() {
        var top = m.tan(this.fieldOfView / 360 * m.PI) * this.near * this.zoom;
        var right = this.aspect * top;
        return m4.frustum(-right, right, -top, top, this.near, this.far, this.projectionMatrix);
	};
	_.orthogonalProjectionMatrix = function() {
        var top = m.tan(this.fieldOfView / 360 * m.PI) * ((this.far - this.near) / 2 + this.near) * this.zoom;
        var right = this.aspect * top;
        return m4.ortho(-right, right, -top, top, this.near, this.far, this.projectionMatrix);
	};
	_.updateProjectionMatrix = function(isPerspective) {
		return isPerspective ? this.perspectiveProjectionMatrix() : this.orthogonalProjectionMatrix();
	};
	_.focalLength = function() {
		return (this.far - this.near) / 2 + this.near;
	};
    _.zoomIn = function() {
        this.zoom = m.min(this.zoom * 1.25, 200);
    };
    _.zoomOut = function() {
        this.zoom = m.max(this.zoom / 1.25, 1 / 400);
    };

})(math, d3, v3, m4, m);

(function(d3, m, m4, undefined) {
	'use strict';
	d3.LineArrow = function() {
		var d = 2.8;
		var w = 0.1;

		this.storeData([
				0, 0, -3, w, 0, -d,
				0, 0, -3, -w, 0, -d,

				0, 0, -3, 0, 0, 3,

				0, 0, 3, w, 0, d,
				0, 0, 3, -w, 0, d
			],
			[
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0
			]);
	};
	d3.LineArrow.prototype = new d3._Mesh();
	
	d3.Compass = function(gl, specs) {

		// setup text X Y Z
		this.textImage = new d3.TextImage();
		this.textImage.init(gl);
		this.textImage.updateFont(gl, specs.text_font_size, specs.text_font_families, specs.text_font_bold, specs.text_font_italic, specs.text_font_stroke_3D);

		this.textMesh = new d3.TextMesh();
		this.textMesh.init(gl);

		var screenRatioHeight = specs.compass_size_3D / gl.canvas.clientHeight;

		var height = 3 / screenRatioHeight;
		var tanTheta = m.tan(specs.projectionPerspectiveVerticalFieldOfView_3D / 360 * m.PI);
		var depth = height / tanTheta;
		var near = m.max(depth - height, 0.1);
		var far = depth + height;

		var aspec = gl.canvas.clientWidth / gl.canvas.clientHeight;

		var fnProjection, z;

		if (specs.projectionPerspective_3D) {
			z = near;
			fnProjection = m4.frustum;
		} else {
			z = depth;
			fnProjection = m4.ortho;
		}

		var nearRatio = z / gl.canvas.clientHeight * 2 * tanTheta;
		var top = tanTheta * z;
		var bottom = -top;
		var left = aspec * bottom;
		var right = aspec * top;

		if(specs.compass_type_3D === 0) {
			var deltaX = -(gl.canvas.clientWidth - specs.compass_size_3D) / 2 + this.textImage.charHeight;
			var deltaY = -(gl.canvas.clientHeight - specs.compass_size_3D) / 2 + this.textImage.charHeight;

			var x = deltaX * nearRatio;
			var y = deltaY * nearRatio;

			left -= x;
			right -= x;
			bottom -= y;
			top -= y;
		}

		this.projectionMatrix = fnProjection(left, right, bottom, top, near, far);
		this.translationMatrix = m4.translate(m4.identity([]), [ 0, 0, -depth ]);

		// vertex data for X Y Z text label
		var vertexData = {
			position : [],
			texCoord : [],
			translation : []
		};

		// it need to auto calculated somehow
		var textPos = 3.5;

		this.textImage.pushVertexData('X', [ textPos, 0, 0 ], 0, vertexData);
		this.textImage.pushVertexData('Y', [ 0, textPos, 0 ], 0, vertexData);
		this.textImage.pushVertexData('Z', [ 0, 0, textPos ], 0, vertexData);

		this.textMesh.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation);
	};

	var _ = d3.Compass.prototype;
	_.renderArrow = function(gl, type, color, mvMatrix) {
		gl.material.setDiffuseColor(gl, color);
		gl.shader.setModelViewMatrix(gl, mvMatrix);
		if(type === 1) {
			gl.drawArrays(gl.LINES, 0, gl.lineArrowBuffer.vertexPositionBuffer.numItems);
		} else {
			gl.drawElements(gl.TRIANGLES, gl.arrowBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
	};
	_.render = function(gl, specs) {
		gl.shader.setProjectionMatrix(gl, this.projectionMatrix);
		specs.compass_type_3D === 1 ? gl.lineArrowBuffer.bindBuffers(gl) : gl.arrowBuffer.bindBuffers(gl);

		gl.material.setTempColors(gl, specs.bonds_materialAmbientColor_3D, undefined, specs.bonds_materialSpecularColor_3D, specs.bonds_materialShininess_3D);

		var modelMatrix = m4.multiply(this.translationMatrix, gl.rotationMatrix, []);
		var angle = m.PI / 2;

		// x - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisXColor_3D, m4.rotateY(modelMatrix, angle, []));

		// y - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisYColor_3D, m4.rotateX(modelMatrix, -angle, []));

		// z - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisZColor_3D, modelMatrix);
	};
	_.renderAxis = function(gl) {
		gl.shader.setProjectionMatrix(gl, this.projectionMatrix);
		var mvMatrix = m4.multiply(this.translationMatrix, gl.rotationMatrix, []);
		gl.shader.setModelViewMatrix(gl, mvMatrix);

		this.textImage.useTexture(gl);
		this.textMesh.render(gl);
	};

})(d3, m, m4);

(function(d3, m, undefined) {
	'use strict';
	d3.Cylinder = function(radius, height, bands, closed) {
		var positionData = [];
		var normalData = [];

		if (closed) {
			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(0, -1, 0);
				positionData.push(0, 0, 0);
				normalData.push(0, -1, 0);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);

			}

			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);

				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, height, radius * sinTheta);
			}

			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(0, 1, 0);
				positionData.push(radius * cosTheta, height, radius * sinTheta);

				normalData.push(0, 1, 0);
				positionData.push(0, height, 0);
			}
		} else {
			for (var i = 0; i < bands; i++) {
				var theta = i * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);
				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);
				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, height, radius * sinTheta);
			}
			normalData.push(1, 0, 0);
			positionData.push(radius, 0, 0);
			normalData.push(1, 0, 0);
			positionData.push(radius, height, 0);
		}

		this.storeData(positionData, normalData);
	};
	d3.Cylinder.prototype = new d3._Mesh();

})(d3, m);

(function(ELEMENT, d3, m, v3, undefined) {
	'use strict';
	d3.Distance = function(a1, a2, node, offset) {
		this.a1 = a1;
		this.a2 = a2;
		this.node = node;
		this.offset = offset ? offset : 0;
	};
	var _ = d3.Distance.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [ this.a1.x, this.a1.y, this.a1.z, this.a2.x, this.a2.y, this.a2.z ];
		if (this.node) {
			var r1 = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.a1.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
			var r2 = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.a2.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
			this.move = this.offset + m.max(r1, r2);
			this.displacement = [ (this.a1.x + this.a2.x) / 2 - this.node.x, (this.a1.y + this.a2.y) / 2 - this.node.y, (this.a1.z + this.a2.z) / 2 - this.node.z ];
			v3.normalize(this.displacement);
			var change = v3.scale(this.displacement, this.move, []);
			positionData[0] += change[0];
			positionData[1] += change[1];
			positionData[2] += change[2];
			positionData[3] += change[0];
			positionData[4] += change[1];
			positionData[5] += change[2];
		}
		var normalData = [ 0, 0, 0, 0, 0, 0 ];
		var indexData = [ 0, 1 ];
		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		var dist = this.a1.distance3D(this.a2);
		var center = [ (this.a1.x + this.a2.x) / 2, (this.a1.y + this.a2.y) / 2, (this.a1.z + this.a2.z) / 2 ];
		if (this.node) {
			var change = v3.scale(this.displacement, this.move+.1, []);
			center[0] += change[0];
			center[1] += change[1];
			center[2] += change[2];
		}
		return {
			pos : center,
			value : [ dist.toFixed(2), ' \u212b' ].join('')
		};
	};

})(ELEMENT, d3, m, v3);

(function(math, d3, v3, undefined) {
	'use strict';

	d3.Fog = function(color, fogStart, fogEnd, density) {
		this.fogScene(color, fogStart, fogEnd, density);
	};
	var _ = d3.Fog.prototype;
	_.fogScene = function(color, fogStart, fogEnd, density) {
		this.colorRGB = math.getRGB(color, 1);
		this.fogStart = fogStart;
		this.fogEnd = fogEnd;
		this.density = density;
	};
	
})(math, d3, v3);

(function(ELEMENT, d3, undefined) {

	d3.Label = function(textImage) {
	};
	var _ = d3.Label.prototype;
	_.updateVerticesBuffer = function(gl, molecules, specs) {
		for ( var i = 0, ii = molecules.length; i < ii; i++) {
			var molecule = molecules[i];
			var moleculeLabel = molecule.labelMesh;
			var atoms = molecule.atoms;
			var vertexData = {
				position : [],
				texCoord : [],
				translation : []
			};

			var isMacro = atoms.length > 0 && atoms[0].hetatm != undefined;

			for ( var j = 0, jj = atoms.length; j < jj; j++) {
				var atom = atoms[j];
				
				var atomLabel = atom.label;
				var zDepth = 0.05;

				// Sphere or Ball and Stick
				if (specs.atoms_useVDWDiameters_3D) {
					var add = ELEMENT[atomLabel].vdWRadius * specs.atoms_vdwMultiplier_3D;
					if (add === 0) {
						add = 1;
					}
					zDepth += add;
				}
				// if Stick or Wireframe
				else if (specs.atoms_sphereDiameter_3D) {
					zDepth += specs.atoms_sphereDiameter_3D / 2 * 1.5;
				}

				if (isMacro) {
					if (!atom.hetatm) {
						if (!specs.macro_displayAtoms) {
							continue;
						}
					} else if (atom.isWater) {
						if (!specs.macro_showWaters) {
							continue;
						}
					}
				}
				
				gl.textImage.pushVertexData(atom.altLabel ? atom.altLabel : atom.label, [ atom.x, atom.y, atom.z ], zDepth, vertexData);

			}

			var chains = molecule.chains;

			if (chains && (specs.proteins_displayRibbon || specs.proteins_displayBackbone)) {

				for ( var j = 0, jj = chains.length; j < jj; j++) {
					var chain = chains[j];

					for ( var k = 0, kk = chain.length; k < kk; k++) {
						var residue = chain[k];

						if (residue.name) {
							var atom = residue.cp1;
							gl.textImage.pushVertexData(residue.name, [ atom.x, atom.y, atom.z ], 2, vertexData);
						}
					}
				}

			}

			moleculeLabel.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation, vertexData.zDepth);
		}
	};
	_.render = function(gl, specs, molecules) {
		// use projection for shader text.
		gl.shader.setMatrixUniforms(gl);

		gl.textImage.useTexture(gl);
		for ( var i = 0, ii = molecules.length; i < ii; i++) {
			if (molecules[i].labelMesh) {
				molecules[i].labelMesh.render(gl);
			}
		}
	};

})(ELEMENT, d3);

(function(d3, m, undefined) {
	'use strict';
	d3.Sphere = function(radius, latitudeBands, longitudeBands) {
		var positionData = [];
		var normalData = [];
		for ( var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
			var theta = latNumber * m.PI / latitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta);

			for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
				var phi = longNumber * 2 * m.PI / longitudeBands;
				var sinPhi = m.sin(phi);
				var cosPhi = m.cos(phi);

				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;

				normalData.push(x, y, z);
				positionData.push(radius * x, radius * y, radius * z);
			}
		}

		var indexData = [];
		longitudeBands += 1;
		for ( var latNumber = 0; latNumber < latitudeBands; latNumber++) {
			for ( var longNumber = 0; longNumber < longitudeBands; longNumber++) {
				var first = (latNumber * longitudeBands) + (longNumber % longitudeBands);
				var second = first + longitudeBands;
				indexData.push(first, first + 1, second);
				if (longNumber < longitudeBands - 1) {
					indexData.push(second, first + 1, second + 1);
				}
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Sphere.prototype = new d3._Mesh();

})(d3, m);

(function(RESIDUE, d3, m, v3, undefined) {
	'use strict';
	var loadPartition = function(gl, p) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, p.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, p.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.vertexIndexBuffer);
	};

	function SubRibbon(entire, name, indexes, pi) {
		this.entire = entire;
		this.name = name;
		this.indexes = indexes;
		this.pi = pi;
	}
	var _2 = SubRibbon.prototype;
	// NOTE: To use rainbow coloring for chains, it needs coloring each residue with total residue count
	// and current index residue in chain parameters.
	_2.getColor = function(specs) {
		if (specs.macro_colorByChain) {
			return this.entire.chainColor;
		} else if (this.name) {
			return this.getResidueColor(RESIDUE[this.name] ? this.name : '*', specs);
		} else if (this.helix) {
			return this.entire.front ? specs.proteins_ribbonCartoonHelixPrimaryColor : specs.proteins_ribbonCartoonHelixSecondaryColor;
		} else if (this.sheet) {
			return specs.proteins_ribbonCartoonSheetColor;
		} else {
			return this.entire.front ? specs.proteins_primaryColor : specs.proteins_secondaryColor;
		}
	};
	_2.getResidueColor = function(name, specs) {
		var r = RESIDUE[name];
		if (specs.proteins_residueColor === 'shapely') {
			return r.shapelyColor;
		} else if (specs.proteins_residueColor === 'amino') {
			return r.aminoColor;
		} else if (specs.proteins_residueColor === 'polarity') {
			if (r.polar) {
				return '#C10000';
			} else {
				return '#FFFFFF';
			}
		} else if (specs.proteins_residueColor === 'acidity') {
			if(r.acidity === 1){
				return '#0000FF';
			}else if(r.acidity === -1){
				return '#FF0000';
			}else if (r.polar) {
				return '#FFFFFF';
			} else {
				return '#773300';
			}
		}
		return '#FFFFFF';
	};
	_2.render = function(gl, specs, noColor) {
		if (this.entire.partitions && this.pi !== this.entire.partitions.lastRender) {
			loadPartition(gl, this.entire.partitions[this.pi]);
			this.entire.partitions.lastRender = this.pi;
		}
		if (!this.vertexIndexBuffer) {
			this.vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indexes), gl.STATIC_DRAW);
			this.vertexIndexBuffer.itemSize = 1;
			this.vertexIndexBuffer.numItems = this.indexes.length;
		}
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
		// colors
		if (!noColor && specs.proteins_residueColor !== 'rainbow') {
			gl.material.setDiffuseColor(gl, this.getColor(specs));
		}
		// render
		gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};

	d3.Ribbon = function(chain, offset, cartoon) {
		// ribbon meshes build front to back, not side to side, so keep this in
		// mind
		var lineSegmentNum = chain[0].lineSegments.length;
		var lineSegmentLength = chain[0].lineSegments[0].length;
		this.partitions = [];
		this.partitions.lastRender = 0;
		var currentPartition;
		this.front = offset > 0;
		// calculate vertex and normal points
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : []
				};
				this.partitions.push(currentPartition);
			}
			var residue = chain[i];
			currentPartition.count++;
			for ( var j = 0; j < lineSegmentNum; j++) {
				var lineSegment = cartoon ? residue.lineSegmentsCartoon[j] : residue.lineSegments[j];
				var doSide1 = j === 0;
				var doSide2 = false;
				for ( var k = 0; k < lineSegmentLength; k++) {
					var a = lineSegment[k];
					// normals
					var abovei = i;
					var abovek = k + 1;
					if (i === chain.length - 1 && k === lineSegmentLength - 1) {
						abovek--;
					} else if (k === lineSegmentLength - 1) {
						abovei++;
						abovek = 0;
					}
					var above = cartoon ? chain[abovei].lineSegmentsCartoon[j][abovek] : chain[abovei].lineSegments[j][abovek];
					var negate = false;
					var nextj = j + 1;
					if (j === lineSegmentNum - 1) {
						nextj -= 2;
						negate = true;
					}
					var side = cartoon ? residue.lineSegmentsCartoon[nextj][k] : residue.lineSegments[nextj][k];
					var toAbove = [ above.x - a.x, above.y - a.y, above.z - a.z ];
					var toSide = [ side.x - a.x, side.y - a.y, side.z - a.z ];
					var normal = v3.cross(toAbove, toSide, []);
					// positions
					if (k === 0) {
						// tip
						v3.normalize(toAbove);
						v3.scale(toAbove, -1);
						currentPartition.normalData.push(toAbove[0], toAbove[1], toAbove[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
					}
					if (doSide1 || doSide2) {
						// sides
						v3.normalize(toSide);
						v3.scale(toSide, -1);
						currentPartition.normalData.push(toSide[0], toSide[1], toSide[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
						if (doSide1 && k === lineSegmentLength - 1) {
							doSide1 = false;
							k = -1;
						}
					} else {
						// center strips
						v3.normalize(normal);
						if (negate && !this.front || !negate && this.front) {
							v3.scale(normal, -1);
						}
						currentPartition.normalData.push(normal[0], normal[1], normal[2]);
						v3.scale(normal, m.abs(offset));
						currentPartition.positionData.push(a.x + normal[0], a.y + normal[1], a.z + normal[2]);
						if (j === lineSegmentNum - 1 && k === lineSegmentLength - 1) {
							doSide2 = true;
							k = -1;
						}
					}
					if (k === -1 || k === lineSegmentLength - 1) {
						// end
						v3.normalize(toAbove);
						currentPartition.normalData.push(toAbove[0], toAbove[1], toAbove[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
					}
				}
			}
		}
		
		// build mesh connectivity
		// add 2 to lineSegmentNum and lineSegmentLength to account for sides
		// and ends
		lineSegmentNum += 2;
		lineSegmentLength += 2;
		this.segments = [];
		this.partitionSegments = [];
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			var partitionSegmentIndexData = [];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var chainIndex = i;
				for ( var j = 0; j < n; j++) {
					chainIndex += this.partitions[j].count - 1;
				}
				var c = chain[chainIndex];
				var residueIndexStart = i * lineSegmentNum * lineSegmentLength;
				var individualIndexData = [];
				for ( var j = 0, jj = lineSegmentNum - 1; j < jj; j++) {
					var segmentIndexStart = residueIndexStart + j * lineSegmentLength;
					for ( var k = 0; k < lineSegmentLength-1; k++) {
						var nextRes = 1;
						if (i === ii) {
							nextRes = 0;
						}
						var add = [ segmentIndexStart + k, segmentIndexStart + lineSegmentLength + k, segmentIndexStart + lineSegmentLength + k + nextRes, segmentIndexStart + k, segmentIndexStart + k + nextRes, segmentIndexStart + lineSegmentLength + k + nextRes ];
						if (k !== lineSegmentLength - 1) {
							if (this.front) {
								individualIndexData.push(add[0], add[1], add[2], add[3], add[5], add[4]);
							} else {
								individualIndexData.push(add[0], add[2], add[1], add[3], add[4], add[5]);
							}
						}
						if (k === lineSegmentLength - 2 && !(i === currentPartition.count - 2 && n === this.partitions.length - 1)) {
							// jump the gap, the other mesh points will be
							// covered,
							// so no need to explicitly skip them
							var jump = lineSegmentNum * lineSegmentLength - k;
							add[2] += jump;
							add[4] += jump;
							add[5] += jump;
						}
						if (this.front) {
							partitionSegmentIndexData.push(add[0], add[1], add[2], add[3], add[5], add[4]);
						} else {
							partitionSegmentIndexData.push(add[0], add[2], add[1], add[3], add[4], add[5]);
						}
					}
				}

				if (cartoon && c.split) {
					var sr = new SubRibbon(this, undefined, partitionSegmentIndexData, n);
					sr.helix = c.helix;
					sr.sheet = c.sheet;
					this.partitionSegments.push(sr);
					partitionSegmentIndexData = [];
				}

				this.segments.push(new SubRibbon(this, c.name, individualIndexData, n));
			}

			var sr = new SubRibbon(this, undefined, partitionSegmentIndexData, n);
			sr.helix = c.helix;
			sr.sheet = c.sheet;
			this.partitionSegments.push(sr);
		}
		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData);
		if (this.partitions.length === 1) {
			// clear partitions to reduce overhead
			this.partitions = undefined;
		}
	};
	var _ = d3.Ribbon.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		this.bindBuffers(gl);
		// colors
		var color = specs.macro_colorByChain ? this.chainColor : undefined;
		if (!color) {
			color = this.front ? specs.proteins_primaryColor : specs.proteins_secondaryColor;
		}
		gl.material.setDiffuseColor(gl, color);
			
		for ( var i = 0, ii = this.partitionSegments.length; i < ii; i++) {
			this.partitionSegments[i].render(gl, specs, !specs.proteins_ribbonCartoonize);
		}
	};

})(RESIDUE, d3, m, v3);

(function(math, d3, v3, m4, undefined) {
	'use strict';
	d3.Light = function(diffuseColor, specularColor, direction) {
		this.camera = new d3.Camera();
		this.lightScene(diffuseColor, specularColor, direction);
	};
	var _ = d3.Light.prototype;
	_.lightScene = function(diffuseColor, specularColor, direction) {
		this.diffuseRGB = math.getRGB(diffuseColor, 1);
		this.specularRGB = math.getRGB(specularColor, 1);
		this.direction = direction;
		this.updateView();
	};
	_.updateView = function() {
		var lightDir = v3.normalize(this.direction, []);
		var eyePos = v3.scale(lightDir, (this.camera.near - this.camera.far) / 2 - this.camera.near, []);
		var up = v3.equal(lightDir, [0, 1, 0]) ? [0, 0, 1] : [0, 1, 0];
		m4.lookAt(eyePos, [0, 0, 0], up, this.camera.viewMatrix);
		this.camera.orthogonalProjectionMatrix();
	};

})(math, d3, v3, m4);

(function(d3, undefined) {
	'use strict';
	d3.Line = function() {
		this.storeData([ 0, 0, 0, 0, 1, 0 ], [ 0, 0, 0, 0, 0, 0 ]);
	};
	d3.Line.prototype = new d3._Mesh();

})(d3);

(function(math, d3, undefined) {
	'use strict';
	d3.Material = function() {
	};
	var _ = d3.Material.prototype;
	_.setTempColors = function(gl, ambientColor, diffuseColor, specularColor, shininess) {
		if (ambientColor) {
			gl.shader.setMaterialAmbientColor(gl, math.getRGB(ambientColor, 1));
		}
		if (diffuseColor) {
			gl.shader.setMaterialDiffuseColor(gl, math.getRGB(diffuseColor, 1));
		}
		if (specularColor) {
			gl.shader.setMaterialSpecularColor(gl, math.getRGB(specularColor, 1));
		}
		gl.shader.setMaterialShininess(gl, shininess);
		gl.shader.setMaterialAlpha(gl, 1);
	};
	_.setDiffuseColor = function(gl, diffuseColor) {
		gl.shader.setMaterialDiffuseColor(gl, math.getRGB(diffuseColor, 1));
	};
	_.setAlpha = function(gl, alpha) {
		gl.shader.setMaterialAlpha(gl, alpha);
	};

})(math, d3);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Picker = function() {
	};
	var _ = d3.Picker.prototype;

	_.init = function(gl) {
		// setup for picking system
		this.framebuffer = gl.createFramebuffer();

		// set pick texture
		var texture2D = gl.createTexture();
		var renderbuffer = gl.createRenderbuffer();

		gl.bindTexture(gl.TEXTURE_2D, texture2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

		// set framebuffer and bind the texture and renderbuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2D, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

	_.setDimension = function(gl, width, height) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

		// get binded depth attachment renderbuffer
		var renderbuffer = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
		if (gl.isRenderbuffer(renderbuffer)) {
			// set renderbuffer dimension
			gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		}

		// get binded color attachment texture 2d
		var texture2D = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
		if (gl.isTexture(texture2D)) {
			// set texture dimension
			gl.bindTexture(gl.TEXTURE_2D, texture2D);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

})(d3, math, document);

(function(d3, m, undefined) {
	'use strict';

	d3.Pill = function(radius, height, latitudeBands, longitudeBands) {

		var capHeightScale = 1;
		var capDiameter = 2 * radius;

		height -= capDiameter;

		if (height < 0) {
			capHeightScale = 0;
			height += capDiameter;
		} else if (height < capDiameter) {
			capHeightScale = height / capDiameter;
			height = capDiameter;
		}

		// update latitude and logintude band for two caps.
		// latitudeBands *= 2;
		// longitudeBands *= 2;

		var positionData = [];
		var normalData = [];
		for ( var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
			var theta = latNumber * m.PI / latitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta) * capHeightScale;

			for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
				var phi = longNumber * 2 * m.PI / longitudeBands;
				var sinPhi = m.sin(phi);
				var cosPhi = m.cos(phi);

				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;

				normalData.push(x, y, z);
				positionData.push(radius * x, radius * y + (latNumber < latitudeBands / 2 ? height : 0), radius * z);
			}
		}

		var indexData = [];
		longitudeBands += 1;
		for ( var latNumber = 0; latNumber < latitudeBands; latNumber++) {
			for ( var longNumber = 0; longNumber < longitudeBands; longNumber++) {
				var first = (latNumber * longitudeBands) + (longNumber % longitudeBands);
				var second = first + longitudeBands;
				indexData.push(first, first + 1, second);
				if (longNumber < longitudeBands - 1) {
					indexData.push(second, first + 1, second + 1);
				}
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Pill.prototype = new d3._Mesh();

})(d3, m);

(function(extensions, RESIDUE, d3, m, m4, v3, math, undefined) {
	'use strict';
	
	function createDummyResidue(x, y, z) {
		var dummyRes = new Residue(-1);
		dummyRes.cp1 = dummyRes.cp2 = new Atom('', x, y, z);
		return dummyRes;
	}
	
	function Pipe(a1, a2) {
		this.a1 = a1;
		this.a2 = a2;
	};
	var _ = Pipe.prototype;
	_.render = function(gl, specs) {
		var p1 = this.a1;
		var p2 = this.a2;
		var height = 1.001 * p1.distance3D(p2);
		var radiusScale = specs.proteins_cylinderHelixDiameter / 2;
		var scaleVector = [ radiusScale, height, radiusScale ];
		var transform = m4.translate(m4.identity(), [ p1.x, p1.y, p1.z ]);
		var y = [ 0, 1, 0 ];
		var ang = 0;
		var axis;
		if (p1.x === p2.x && p1.z === p2.z) {
			axis = [ 0, 0, 1 ];
			if (p2.y < p1.y) {
				ang = m.PI;
			}
		} else {
			var a2b = [ p2.x - p1.x, p2.y - p1.y, p2.z - p1.z ];
			ang = extensions.vec3AngleFrom(y, a2b);
			axis = v3.cross(y, a2b, []);
		}

		if (ang !== 0) {
			m4.rotate(transform, ang, axis);
		}
		m4.scale(transform, scaleVector);
		gl.shader.setMatrixUniforms(gl, transform);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderClosedBuffer.vertexPositionBuffer.numItems);
	};

	function Plank(a1, a2, vx) {
		this.a1 = a1;
		this.a2 = a2;
		this.vx = vx;
	};
	var _ = Plank.prototype;
	_.render = function(gl, specs) {
		if (this.specs) {
			specs = this.specs;
		}
		// this is the elongation vector for the plank
		var height = 1.001 * this.a1.distance3D(this.a2);

		var diry = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];
		var dirz = v3.cross(diry, this.vx, []);
		var dirx = v3.cross(dirz, diry, []);

		v3.normalize(dirx);
		v3.normalize(diry);
		v3.normalize(dirz);

		var transform = [
			dirx[0], dirx[1], dirx[2], 0,
			diry[0], diry[1], diry[2], 0,
			dirz[0], dirz[1], dirz[2], 0,
			this.a1.x, this.a1.y, this.a1.z, 1
		];

		var scaleVector = [ specs.proteins_plankSheetWidth, height, specs.proteins_tubeThickness];
		m4.scale(transform, scaleVector);
		gl.shader.setMatrixUniforms(gl, transform);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.boxBuffer.vertexPositionBuffer.numItems);
	};


	d3.PipePlank = function(rs, specs) {
		this.tubes = [];
		this.helixCylinders = [];
		this.sheetPlanks = [];
		this.chainColor = rs.chainColor;

		var chainNoSS = [];
		var noSSResidues = [];
		var helixResidues = [];
		var sheetResidues = [];

		// the first residue just a dummy residue.
		// so at beginning, the secondary structure of second residue must be check
		if(rs.length > 1) {
			var r0 = rs[0];
			var r1 = rs[1];
			if (r1.helix) {
				helixResidues.push(r0);
			} else if(r1.sheet) {
				sheetResidues.push(r0);
			} else {
				noSSResidues.push(r0);
			}
		}

		// iterate residues
		for ( var i = 1, ii = rs.length - 1; i <= ii; i++) {
			var residue = rs[i];
			if(residue.helix) {
				helixResidues.push(residue);

				if(residue.arrow) {
					var startPoint = v3.create();
					var endPoint = v3.create();

					if (helixResidues.length == 2) {
						// PDB like 2PEC have helix which is just have 2 residues in it.
						startPoint = [helixResidues[0].cp1.x, helixResidues[0].cp1.y, helixResidues[0].cp1.z];
						endPoint = [helixResidues[1].cp1.x, helixResidues[1].cp1.y, helixResidues[1].cp1.z];
					} else {
						
						// To get helix axis, we need at least 4 residues.
						// if residues lenght is 3, then one residue need to be added.
						// The added residue is residue before helix.
						if(helixResidues.length == 3) {
							helixResidues.unshift(rs[m.max(i - 3, 0)]);
						}

						var Ps = [];
						var Vs = [];

						for (var h = 1, hh = helixResidues.length - 1; h < hh; h++) {
							var cai = [helixResidues[h].cp1.x, helixResidues[h].cp1.y, helixResidues[h].cp1.z];
							var A = [helixResidues[h-1].cp1.x, helixResidues[h-1].cp1.y, helixResidues[h-1].cp1.z];
							var B = [helixResidues[h+1].cp1.x, helixResidues[h+1].cp1.y, helixResidues[h+1].cp1.z];

							v3.subtract(A, cai);
							v3.subtract(B, cai);

							var Al = v3.scale(A, v3.length(B), []);
							var Bl = v3.scale(B, v3.length(A), []);

							var V = v3.normalize(v3.add(Al, Bl, []));

							Ps.push(cai);
							Vs.push(V);
						}

						var axes = [];
						for (var h = 0, hh = Ps.length - 1; h < hh; h++) {
							var P1 = Ps[h];
							var V1 = Vs[h];
							var P2 = Ps[h+1];
							var V2 = Vs[h+1];

							var H = v3.normalize(v3.cross(V1, V2, []));

							var P2subP1 = v3.subtract(P2, P1, []);
							var d = v3.dot(P2subP1, H);

							var dH = v3.scale(H, d, []);

							var dHl = v3.length(dH);
							var P2subP1l = v3.length(P2subP1);

							var r = -(dHl * dHl - P2subP1l * P2subP1l) / (2 * v3.dot(v3.subtract(P1, P2, []), V2));

							var H1 = v3.add(P1, v3.scale(V1, r, []), []);
							var H2 = v3.add(P2, v3.scale(V2, r, []), []);

							axes.push([H1, H2]);
						}

						var firstPoint = axes[0][0];
						var secondPoint = axes[0][1];
						var secondToFirst = v3.subtract(firstPoint, secondPoint, []);
						v3.add(firstPoint, secondToFirst, startPoint);

						var firstPoint = axes[axes.length-1][1];
						var secondPoint = axes[axes.length-1][0];
						var secondToFirst = v3.subtract(firstPoint, secondPoint, []);
						v3.add(firstPoint, secondToFirst, endPoint);

					}

					var startAtom = new Atom('', startPoint[0], startPoint[1], startPoint[2]);
					var endAtom = new Atom('', endPoint[0], endPoint[1], endPoint[2]);

					this.helixCylinders.push(new Pipe(startAtom, endAtom));

					helixResidues = [];

					// get vector direction from Pipe end to start
					var helixDir = v3.subtract(startPoint, endPoint, []);
					v3.normalize(helixDir);
					v3.scale(helixDir, .5);

					if (noSSResidues.length > 0) {

						var additionCp = v3.add(startPoint, helixDir, []);
						var prevResCp = noSSResidues[noSSResidues.length - 1].cp1;
						var helixDirToPrevRes = v3.subtract([prevResCp.x, prevResCp.y, prevResCp.z], additionCp, []);
						v3.normalize(helixDirToPrevRes);
						v3.scale(helixDirToPrevRes, .5);
						v3.add(additionCp, helixDirToPrevRes);
						var dummyRes = new Residue(-1);
						dummyRes.cp1 = dummyRes.cp2 = new Atom('', additionCp[0], additionCp[1], additionCp[2]);
						noSSResidues.push(dummyRes);

						// force the non secondary structure spline to end on helix start point.
						var dummyRes = createDummyResidue(startPoint[0], startPoint[1], startPoint[2]);
						noSSResidues.push(dummyRes);

						chainNoSS.push(noSSResidues);
					}

					noSSResidues = [];

					// check for next residue
					if (i < ii) {
						// force the non secondary structure spline to start on helix end point.
						var dummyRes = createDummyResidue(endPoint[0], endPoint[1], endPoint[2]);
						noSSResidues.push(dummyRes);

						var rm = rs[i + 1];
						if (rm.sheet) {
							noSSResidues.push(residue);
							noSSResidues.push(residue);
							chainNoSS.push(noSSResidues);
							noSSResidues = [];

							sheetResidues.push(residue);
						} else {
							// force the non secondary structure spline to start on helix end point.
							v3.scale(helixDir, -1);
							var additionCp = v3.add(endPoint, helixDir, []);
							var nextResCp = rm.cp1;
							var helixDirToNextRes = v3.subtract([nextResCp.x, nextResCp.y, nextResCp.z], additionCp, []);
							v3.normalize(helixDirToNextRes);
							v3.scale(helixDirToNextRes, .5);
							v3.add(additionCp, helixDirToNextRes);
							var dummyRes = createDummyResidue(additionCp[0], additionCp[1], additionCp[2]);
							noSSResidues.push(dummyRes);
						}
					}
				}

			} else if(residue.sheet) {

				sheetResidues.push(residue);
				if(residue.arrow) {

					var p1 = [0, 0, 0];
					var p2 = [0, 0, 0];
					for(var h = 0, hh = sheetResidues.length; h < hh; h++) {
						var guidePoints = sheetResidues[h].guidePointsLarge;
						var gp1 = guidePoints[0];
						var gp2 = guidePoints[guidePoints.length - 1];

						v3.add(p1, [gp1.x, gp1.y, gp1.z]);
						v3.add(p2, [gp2.x, gp2.y, gp2.z]);
					}

					v3.scale(p1, 1 / hh);
					v3.scale(p2, 1 / hh);

					var dirx = v3.subtract(p1, p2);

					var firstRs = sheetResidues[0];
					var lastRs = sheetResidues[sheetResidues.length - 1];

					var firstGuidePoints = firstRs.guidePointsSmall[0];
					var lastGuidePoints = lastRs.guidePointsSmall[0];

					this.sheetPlanks.push(new Plank(firstGuidePoints, lastGuidePoints, dirx));

					sheetResidues = [];

					if (i < ii) {
						var rm = rs[i + 1];

						if (rm.sheet) {
							sheetResidues.push(residue);
						} else {
							var dummyRes = createDummyResidue(lastGuidePoints.x, lastGuidePoints.y, lastGuidePoints.z);
							noSSResidues.push(dummyRes);
						}
					}
				}

			} else {
				noSSResidues.push(residue);

				if (i < ii) {
					var rm = rs[i + 1];
					if (rm.sheet) {
						var guidePoints = residue.guidePointsSmall[0];
						var dummyRes = createDummyResidue(guidePoints.x, guidePoints.y, guidePoints.z);

						noSSResidues.push(dummyRes);

						chainNoSS.push(noSSResidues);
						noSSResidues = [];

						sheetResidues.push(residue);
					}
				}
			}
		}

		if(noSSResidues.length > 1) {
			if(noSSResidues.length == 2) {
				noSSResidues.push(noSSResidues[noSSResidues.length - 1]);
			}
			chainNoSS.push(noSSResidues);
		}
		noSSResidues = [];

		var chainSegments = [];
		for ( var n = 0, nn = chainNoSS.length; n < nn; n++) {
			var nhs = chainNoSS[n];
			var lineSegmentsList = [];

			for ( var i = 0, ii = nhs.length - 1; i <= ii; i++) {
				lineSegmentsList.push(nhs[i].cp1);
			}
			chainSegments.push(lineSegmentsList);
		}

		for (var i = 0, ii = chainSegments.length; i < ii; i++) {
			var t = new d3.CatmullTube(chainSegments[i], specs.proteins_tubeThickness, specs.proteins_tubeResolution_3D, specs.proteins_horizontalResolution);
			t.chainColor = rs.chainColor;
			this.tubes.push(t);
		}
	};
	var _ = d3.PipePlank.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.material.setTempColors(gl, specs.proteins_materialAmbientColor_3D, undefined, specs.proteins_materialSpecularColor_3D, specs.proteins_materialShininess_3D);
		
		// colors
		gl.material.setDiffuseColor(gl, specs.macro_colorByChain ? this.chainColor : specs.proteins_tubeColor);
		for ( var j = 0, jj = this.tubes.length; j < jj; j++) {
			gl.shader.setMatrixUniforms(gl);
			this.tubes[j].render(gl, specs);
		}

		if(!specs.macro_colorByChain) {
			gl.material.setDiffuseColor(gl, specs.proteins_ribbonCartoonHelixSecondaryColor);
		}

		gl.cylinderClosedBuffer.bindBuffers(gl);
		for (var j = 0, jj = this.helixCylinders.length; j < jj; j++) {
			this.helixCylinders[j].render(gl, specs);
		}

		if(!specs.macro_colorByChain) {
			gl.material.setDiffuseColor(gl, specs.proteins_ribbonCartoonSheetColor);
		}

		gl.boxBuffer.bindBuffers(gl);
		for (var j = 0, jj = this.sheetPlanks.length; j < jj; j++) {
			this.sheetPlanks[j].render(gl, specs);
		}

	};

})(extensions, RESIDUE, d3, m, m4, v3, math);

(function(d3, undefined) {
	'use strict';
	d3.Quad = function() {
		var positionData = [
			-1, 1, 0, 
			-1, -1, 0, 
			1, 1, 0, 
			1, -1, 0
		];
		var normalData = [
			0, 0, 0,
			0, 0, 0,
			0, 0, 0,
			0, 0, 0
		];
		this.storeData(positionData, normalData);
	};
	d3.Quad.prototype = new d3._Mesh();

})(d3);

(function(d3, v3, undefined) {
	'use strict';
	d3.Shape = function(points, thickness) {
		// points must be in the xy-plane, all z-coords must be 0, thickness
		// will be in the z-plane
		var numPoints = points.length;
		var positionData = [];
		var normalData = [];

		// calculate vertex and normal points
		var center = new Point();
		for ( var i = 0, ii = numPoints; i < ii; i++) {
			var next = i + 1;
			if (i === ii - 1) {
				next = 0;
			}
			var z = [ 0, 0, 1 ];
			var currentPoint = points[i];
			var nextPoint = points[next];
			var v = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, 0 ];
			var normal = v3.cross(z, v);
			// first four are for the side normal
			// second four will do both the bottom and top triangle normals
			for ( var j = 0; j < 2; j++) {
				positionData.push(currentPoint.x, currentPoint.y, thickness / 2);
				positionData.push(currentPoint.x, currentPoint.y, -thickness / 2);
				positionData.push(nextPoint.x, nextPoint.y, thickness / 2);
				positionData.push(nextPoint.x, nextPoint.y, -thickness / 2);
			}
			// side normals
			for ( var j = 0; j < 4; j++) {
				normalData.push(normal[0], normal[1], normal[2]);
			}
			// top and bottom normals
			normalData.push(0, 0, 1);
			normalData.push(0, 0, -1);
			normalData.push(0, 0, 1);
			normalData.push(0, 0, -1);
			center.add(currentPoint);
		}
		// centers
		center.x /= numPoints;
		center.y /= numPoints;
		normalData.push(0, 0, 1);
		positionData.push(center.x, center.y, thickness / 2);
		normalData.push(0, 0, -1);
		positionData.push(center.x, center.y, -thickness / 2);

		// build mesh connectivity
		var indexData = [];
		var centerIndex = numPoints * 8;
		for ( var i = 0, ii = numPoints; i < ii; i++) {
			var start = i * 8;
			// sides
			indexData.push(start);
			indexData.push(start + 3);
			indexData.push(start + 1);
			indexData.push(start);
			indexData.push(start + 2);
			indexData.push(start + 3);
			// top and bottom
			indexData.push(start + 4);
			indexData.push(centerIndex);
			indexData.push(start + 6);
			indexData.push(start + 5);
			indexData.push(start + 7);
			indexData.push(centerIndex + 1);
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Shape.prototype = new d3._Mesh();

})(d3, v3);

(function(d3, m, v3, undefined) {
	'use strict';
	d3.Star = function() {
		var ps = [ .8944, .4472, 0, .2764, .4472, .8506, .2764, .4472, -.8506, -.7236, .4472, .5257, -.7236, .4472, -.5257, -.3416, .4472, 0, -.1056, .4472, .3249, -.1056, .4472, -.3249, .2764, .4472, .2008, .2764, .4472, -.2008, -.8944, -.4472, 0, -.2764, -.4472, .8506, -.2764, -.4472, -.8506, .7236, -.4472, .5257, .7236, -.4472, -.5257, .3416, -.4472, 0, .1056, -.4472, .3249, .1056, -.4472, -.3249, -.2764, -.4472, .2008, -.2764, -.4472, -.2008, -.5527, .1058, 0, -.1708, .1058, .5527, -.1708,
				.1058, -.5527, .4471, .1058, .3249, .4471, .1058, -.3249, .5527, -.1058, 0, .1708, -.1058, .5527, .1708, -.1058, -.5527, -.4471, -.1058, .3249, -.4471, -.1058, -.3249, 0, 1, 0, 0, -1, 0 ];
		var is = [ 0, 9, 8, 2, 7, 9, 4, 5, 7, 3, 6, 5, 1, 8, 6, 0, 8, 23, 30, 6, 8, 3, 21, 6, 11, 26, 21, 13, 23, 26, 2, 9, 24, 30, 8, 9, 1, 23, 8, 13, 25, 23, 14, 24, 25, 4, 7, 22, 30, 9, 7, 0, 24, 9, 14, 27, 24, 12, 22, 27, 3, 5, 20, 30, 7, 5, 2, 22, 7, 12, 29, 22, 10, 20, 29, 1, 6, 21, 30, 5, 6, 4, 20, 5, 10, 28, 20, 11, 21, 28, 10, 19, 18, 12, 17, 19, 14, 15, 17, 13, 16, 15, 11, 18, 16, 31, 19, 17, 14, 17, 27, 2, 27, 22, 4, 22, 29, 10, 29, 19, 31, 18, 19, 12, 19, 29, 4, 29, 20, 3, 20, 28,
				11, 28, 18, 31, 16, 18, 10, 18, 28, 3, 28, 21, 1, 21, 26, 13, 26, 16, 31, 15, 16, 11, 16, 26, 1, 26, 23, 0, 23, 25, 14, 25, 15, 31, 17, 15, 13, 15, 25, 0, 25, 24, 2, 24, 27, 12, 27, 17 ];

		var positionData = [];
		var normalData = [];
		var indexData = [];
		for ( var i = 0, ii = is.length; i < ii; i += 3) {
			var j1 = is[i] * 3;
			var j2 = is[i + 1] * 3;
			var j3 = is[i + 2] * 3;

			var p1 = [ ps[j1], ps[j1 + 1], ps[j1 + 2] ];
			var p2 = [ ps[j2], ps[j2 + 1], ps[j2 + 2] ];
			var p3 = [ ps[j3], ps[j3 + 1], ps[j3 + 2] ];

			var toAbove = [ p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2] ];
			var toSide = [ p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2] ];
			var normal = v3.cross(toSide, toAbove, []);
			v3.normalize(normal);

			positionData.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
			normalData.push(normal[0], normal[1], normal[2], normal[0], normal[1], normal[2], normal[0], normal[1], normal[2]);
			indexData.push(i, i + 1, i + 2);
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Star.prototype = new d3._Mesh();

})(d3, m, v3);

(function(d3, extensions, document, window, undefined) {
	'use strict';
	var ratio = 1;
	if(window.devicePixelRatio){
		ratio = window.devicePixelRatio;
	}
	
	d3.TextImage = function() {
		this.ctx = document.createElement('canvas').getContext('2d');
		this.data = [];
		this.text = '';
		this.charHeight = 0;
	};

	var _ = d3.TextImage.prototype;

	_.init = function(gl) {
		// init texture
		this.textureImage = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.updateFont(gl, 12, [ 'Sans-serif' ], false, false, false);
	};

	_.charData = function(character) {
		var index = this.text.indexOf(character);
		return index >= 0 ? this.data[index] : null;
	};

	_.updateFont = function(gl, fontSize, fontFamilies, fontBold, fontItalic, fontStroke) {
		var ctx = this.ctx;
		var canvas = this.ctx.canvas;
		var data = [];
		var text = "";
		fontSize *= ratio;
		var contextFont = extensions.getFontString(fontSize, fontFamilies, fontBold, fontItalic);

		ctx.font = contextFont;

		ctx.save();

		var totalWidth = 0;
		var charHeight = fontSize * 1.5;

		for ( var i = 32, ii = 127; i < ii; i++) {

			// skip control characters
			// if(i <= 31 || i == 127) continue;

			var character = String.fromCharCode(i), width = ctx.measureText(character).width;

			data.push({
				text : character,
				width : width,
				height : charHeight
			});

			totalWidth += width * 2;
		}
		
		// add other characters
		var chars = '\u00b0\u212b\u00AE'.split('');
		for ( var i = 0, ii = chars.length; i < ii; i++) {

			var character = chars[i], width = ctx.measureText(character).width;

			data.push({
				text : character,
				width : width,
				height : charHeight
			});

			totalWidth += width * 2;
		}

		var areaImage = totalWidth * charHeight;
		var sqrtArea = m.sqrt(areaImage);
		var totalRows = m.ceil(sqrtArea / charHeight);
		var maxWidth = m.ceil(totalWidth / (totalRows - 1));

		canvas.width = maxWidth;
		canvas.height = totalRows * charHeight;

		ctx.font = contextFont;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1.4;

		ctx.fillStyle = "#fff";

		var offsetRow = 0;
		var posX = 0;
		for ( var i = 0, ii = data.length; i < ii; i++) {
			var charData = data[i];
			var charWidth = charData.width * 2;
			var charHeight = charData.height;
			var charText = charData.text;
			var willWidth = posX + charWidth;

			if (willWidth > maxWidth) {
				offsetRow++;
				posX = 0;
			}

			var posY = offsetRow * charHeight;

			if (fontStroke) {
				// stroke must draw before fill
				ctx.strokeText(charText, posX, posY + (charHeight / 2));
			}

			ctx.fillText(charText, posX, posY + (charHeight / 2));

			charData.x = posX;
			charData.y = posY;

			text += charText;
			posX += charWidth;
		}

		this.text = text;
		this.data = data;
		this.charHeight = charHeight;

		// also update the texture
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
	_.pushVertexData = function(text, position, zDepth, data) {
		// characters of string text
		var textPiece = text.toString().split("");

		// height of texture image
		var heightImage = this.getHeight();
		var widthImage = this.getWidth();

		var x1 = -this.textWidth(text) / 2 / ratio;
		var y1 = -this.charHeight / 2 / ratio;

		// iterate each character
		for ( var j = 0, jj = textPiece.length; j < jj; j++) {
			var charData = this.charData(textPiece[j]);

			var width = charData.width;
			var left = charData.x / widthImage;
			var right = left + charData.width * 1.8 / widthImage;
			var top = charData.y / heightImage;
			var bottom = top + charData.height / heightImage;

			var x2 = x1 + width * 1.8 / ratio;
			var y2 = this.charHeight / 2 / ratio;

			data.position.push(
			// left top
			position[0], position[1], position[2],
			// right top
			position[0], position[1], position[2],
			// right bottom
			position[0], position[1], position[2],

			// left top
			position[0], position[1], position[2],
			// left bottom
			position[0], position[1], position[2],
			// right bottom
			position[0], position[1], position[2]);

			data.texCoord.push(
			// left top
			left, top,
			// right bottom
			right, bottom,
			// right top
			right, top,

			// left top
			left, top,
			// left bottom
			left, bottom,
			// right bottom
			right, bottom);

			data.translation.push(
			// left top
			x1, y2, zDepth,
			// right bottom
			x2, y1, zDepth,
			// right top
			x2, y2, zDepth,

			// left top
			x1, y2, zDepth,
			// left bottom
			x1, y1, zDepth,
			// right bottom
			x2, y1, zDepth);

			x1 = x2 + (width - width * 1.8) / ratio;
		}

	};
	_.getCanvas = function() {
		return this.ctx.canvas;
	};
	_.getHeight = function() {
		return this.getCanvas().height;
	};
	_.getWidth = function() {
		return this.getCanvas().width;
	};
	_.textWidth = function(text) {
		return this.ctx.measureText(text).width;
	};
	_.test = function() {
		document.body.appendChild(this.getCanvas());
	};
	_.useTexture = function(gl) {
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);
	};

})(d3, extensions, document, window);

(function(d3, m, undefined) {
	'use strict';
	d3.TextMesh = function() {
	};
	var _ = d3.TextMesh.prototype;
	_.init = function(gl) {
		// set vertex buffer
		this.vertexPositionBuffer = gl.createBuffer();
		this.vertexTexCoordBuffer = gl.createBuffer();
		this.vertexTranslationBuffer = gl.createBuffer();
	};
	_.setVertexData = function(gl, vertexBuffer, bufferData, itemSize) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
		vertexBuffer.itemSize = itemSize;
		vertexBuffer.numItems = bufferData.length / itemSize;
	};
	_.storeData = function(gl, vertexPositionData, vertexTexCoordData, vertexTranslationData) {
		this.setVertexData(gl, this.vertexPositionBuffer, vertexPositionData, 3);
		this.setVertexData(gl, this.vertexTexCoordBuffer, vertexTexCoordData, 2);
		this.setVertexData(gl, this.vertexTranslationBuffer, vertexTranslationData, 3);
	};
	_.bindBuffers = function(gl) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

		// texCoord
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTexCoordBuffer);
		gl.vertexAttribPointer(gl.shader.vertexTexCoordAttribute, this.vertexTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

		// translation and z depth
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTranslationBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, this.vertexTranslationBuffer.itemSize, gl.FLOAT, false, 0, 0);
	};
	_.render = function(gl) {
		var numItems = this.vertexPositionBuffer.numItems;

		if (!numItems) {
			// nothing to do here
			return;
		}

		this.bindBuffers(gl);
		gl.drawArrays(gl.TRIANGLES, 0, numItems);
	};

})(d3, m);

(function(ELEMENT, math, d3, m, m4, v3, undefined) {
	'use strict';
	d3.Torsion = function(a1, a2, a3, a4) {
		this.a1 = a1;
		this.a2 = a2;
		this.a3 = a3;
		this.a4 = a4;
	};
	var _ = d3.Torsion.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [];
		var normalData = [];
		var indexData = [];
		var dist1 = this.a2.distance3D(this.a1);
		var dist2 = this.a2.distance3D(this.a3);
		this.distUse = m.min(dist1, dist2) / 2;
		// data for the angle
		var b1 = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];
		var b2 = [ this.a3.x - this.a2.x, this.a3.y - this.a2.y, this.a3.z - this.a2.z ];
		var b3 = [ this.a4.x - this.a3.x, this.a4.y - this.a3.y, this.a4.z - this.a3.z ];
		var cross12 = v3.cross(b1, b2, []);
		var cross23 = v3.cross(b2, b3, []);
		v3.scale(b1, v3.length(b2));
		this.torsion = m.atan2(v3.dot(b1, cross23), v3.dot(cross12, cross23));

		var vec1 = v3.normalize(v3.cross(cross12, b2, []));
		var vec3 = v3.normalize(v3.cross(b2, vec1, []));

		this.pos = v3.add([ this.a2.x, this.a2.y, this.a2.z ], v3.scale(v3.normalize(b2, []), this.distUse));

		var vec0 = [];

		var bands = specs.measurement_angleBands_3D;
		for ( var i = 0; i <= bands; ++i) {
			var theta = this.torsion * i / bands;
			var vecCos = v3.scale(vec1, m.cos(theta), []);
			var vecSin = v3.scale(vec3, m.sin(theta), []);
			var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

			if (i == 0) {
				vec0 = norm;
			}

			positionData.push(this.pos[0] + norm[0], this.pos[1] + norm[1], this.pos[2] + norm[2]);
			normalData.push(0, 0, 0);
			if (i < bands) {
				indexData.push(i, i + 1);
			}
		}

		this.vecText = v3.normalize(v3.add(vec0, norm, []));
		
		var arrowLength = 0.25;
		var b2Norm = v3.normalize(b2, []);
		v3.scale(b2Norm, arrowLength / 4);

		var theta = this.torsion - m.asin(arrowLength / 2) * 2 * this.torsion / m.abs(this.torsion);
		var vecCos = v3.scale(vec1, m.cos(theta), []);
		var vecSin = v3.scale(vec3, m.sin(theta), []);
		var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

		positionData.push(this.pos[0] + b2Norm[0] + norm[0], this.pos[1] + b2Norm[1] + norm[1], this.pos[2] + b2Norm[2] + norm[2]);
		normalData.push(0, 0, 0);

		positionData.push(this.pos[0] - b2Norm[0] + norm[0], this.pos[1] - b2Norm[1] + norm[1], this.pos[2] - b2Norm[2] + norm[2]);
		normalData.push(0, 0, 0);

		indexData.push(--i, i + 1, i, i + 2);

		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		v3.add(this.pos, v3.scale(this.vecText, this.distUse + 0.3, []));

		return {
			pos : this.pos,
			value : [ math.angleBounds(this.torsion, true, true).toFixed(2), ' \u00b0' ].join('')
		};
	};

})(ELEMENT, math, d3, m, m4, v3);

(function(extensions, RESIDUE, d3, m, m4, v3, math, undefined) {
	'use strict';
	var loadPartition = function(gl, p) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, p.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, p.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.vertexIndexBuffer);
	};

	var PointRotator = function(point, axis, angle) {
		var d = m.sqrt(axis[1] * axis[1] + axis[2] * axis[2]);
		var Rx = [ 1, 0, 0, 0, 0, axis[2] / d, -axis[1] / d, 0, 0, axis[1] / d, axis[2] / d, 0, 0, 0, 0, 1 ];
		var RxT = [ 1, 0, 0, 0, 0, axis[2] / d, axis[1] / d, 0, 0, -axis[1] / d, axis[2] / d, 0, 0, 0, 0, 1 ];
		var Ry = [ d, 0, -axis[0], 0, 0, 1, 0, 0, axis[0], 0, d, 0, 0, 0, 0, 1 ];
		var RyT = [ d, 0, axis[0], 0, 0, 1, 0, 0, -axis[0], 0, d, 0, 0, 0, 0, 1 ];
		var Rz = [ m.cos(angle), -m.sin(angle), 0, 0, m.sin(angle), m.cos(angle), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
		var matrix = m4.multiply(Rx, m4.multiply(Ry, m4.multiply(Rz, m4.multiply(RyT, RxT, []))));
		this.rotate = function() {
			return m4.multiplyVec3(matrix, point);
		};
	};

	d3.Tube = function(chain, thickness, cylinderResolution) {
		var lineSegmentNum = chain[0].lineSegments[0].length;
		this.partitions = [];
		var currentPartition;
		this.ends = [];
		this.ends.push(chain[0].lineSegments[0][0]);
		this.ends.push(chain[chain.length - 1].lineSegments[0][0]);
		// calculate vertex and normal points
		var last = [ 1, 0, 0 ];
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : [],
					indexData : []
				};
				this.partitions.push(currentPartition);
			}
			var residue = chain[i];
			currentPartition.count++;
			var min = Infinity;
			var p = new Atom('', chain[i].cp1.x, chain[i].cp1.y, chain[i].cp1.z);
			for ( var j = 0; j < lineSegmentNum; j++) {
				var currentPoint = residue.lineSegments[0][j];
				var nextPoint;
				if (j === lineSegmentNum - 1) {
					if (i === chain.length - 1) {
						nextPoint = residue.lineSegments[0][j - 1];
					} else {
						nextPoint = chain[i + 1].lineSegments[0][0];
					}
				} else {
					nextPoint = residue.lineSegments[0][j + 1];
				}
				var axis = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, nextPoint.z - currentPoint.z ];
				v3.normalize(axis);
				if (i === chain.length - 1 && j === lineSegmentNum - 1) {
					v3.scale(axis, -1);
				}
				var startVector = v3.cross(axis, last, []);
				v3.normalize(startVector);
				v3.scale(startVector, thickness / 2);
				var rotator = new PointRotator(startVector, axis, 2 * m.PI / cylinderResolution);
				for ( var k = 0, kk = cylinderResolution; k < kk; k++) {
					var use = rotator.rotate();
					if (k === m.floor(cylinderResolution / 4)) {
						last = [ use[0], use[1], use[2] ];
					}
					currentPartition.normalData.push(use[0], use[1], use[2]);
					currentPartition.positionData.push(currentPoint.x + use[0], currentPoint.y + use[1], currentPoint.z + use[2]);
				}
				// find closest point to attach stick to
				if (p) {
					var dist = currentPoint.distance3D(p);
					if (dist < min) {
						min = dist;
						chain[i].pPoint = currentPoint;
					}
				}
			}
		}

		// build mesh connectivity
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var indexStart = i * lineSegmentNum * cylinderResolution;
				for ( var j = 0, jj = lineSegmentNum; j < jj; j++) {
					var segmentIndexStart = indexStart + j * cylinderResolution;
					for ( var k = 0; k < cylinderResolution; k++) {
						var next = 1;
						var sk = segmentIndexStart + k;
						currentPartition.indexData.push(sk);
						currentPartition.indexData.push(sk + cylinderResolution);
						currentPartition.indexData.push(sk + cylinderResolution + next);
						currentPartition.indexData.push(sk);
						currentPartition.indexData.push(sk + cylinderResolution + next);
						currentPartition.indexData.push(sk + next);
					}
				}
			}
		}

		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData, this.partitions[0].indexData);

		var ps = [ new Point(2, 0) ];
		for ( var i = 0; i < 60; i++) {
			var ang = i / 60 * m.PI;
			ps.push(new Point(2 * m.cos(ang), -2 * m.sin(ang)));
		}
		ps.push(new Point(-2, 0), new Point(-2, 4), new Point(2, 4));
		var platform = new d3.Shape(ps, 1);

		this.render = function(gl, specs) {
			// draw tube
			this.bindBuffers(gl);
			// colors
			gl.material.setDiffuseColor(gl, specs.macro_colorByChain ? this.chainColor : specs.nucleics_tubeColor);
			// render
			gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			if (this.partitions) {
				for ( var i = 1, ii = this.partitions.length; i < ii; i++) {
					var p = this.partitions[i];
					loadPartition(gl, p);
					// render
					gl.drawElements(gl.TRIANGLES, p.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
				}
			}

			// draw ends
			gl.sphereBuffer.bindBuffers(gl);
			for ( var i = 0; i < 2; i++) {
				var p = this.ends[i];
				var transform = m4.translate(m4.identity(), [ p.x, p.y, p.z ]);
				var radius = thickness / 2;
				m4.scale(transform, [ radius, radius, radius ]);
				// render
				gl.shader.setMatrixUniforms(gl, transform);
				gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			}

			// draw nucleotide handles
			gl.cylinderBuffer.bindBuffers(gl);
			for ( var i = 0, ii = chain.length - 1; i < ii; i++) {
				var residue = chain[i];
				var p1 = residue.pPoint;
				var p2 = new Atom('', residue.cp2.x, residue.cp2.y, residue.cp2.z);
				var height = 1.001 * p1.distance3D(p2);
				var scaleVector = [ thickness / 4, height, thickness / 4 ];
				var transform = m4.translate(m4.identity(), [ p1.x, p1.y, p1.z ]);
				var y = [ 0, 1, 0 ];
				var ang = 0;
				var axis;
				var a2b = [ p2.x - p1.x, p2.y - p1.y, p2.z - p1.z ];
				if (p1.x === p2.x && p1.z === p2.z) {
					axis = [ 0, 0, 1 ];
					if (p1.y < p1.y) {
						ang = m.PI;
					}
				} else {
					ang = extensions.vec3AngleFrom(y, a2b);
					axis = v3.cross(y, a2b, []);
				}
				if (ang !== 0) {
					m4.rotate(transform, ang, axis);
				}
				m4.scale(transform, scaleVector);
				gl.shader.setMatrixUniforms(gl, transform);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
			}

			// draw nucleotide platforms
			platform.bindBuffers(gl);
			// colors
			if (specs.nucleics_residueColor === 'none' && !specs.macro_colorByChain) {
				gl.material.setDiffuseColor(gl, specs.nucleics_baseColor);
			}
			for ( var i = 0, ii = chain.length - 1; i < ii; i++) {
				var residue = chain[i];
				var p2 = residue.cp2;
				var transform = m4.translate(m4.identity(), [ p2.x, p2.y, p2.z ]);
				// rotate to direction
				var y = [ 0, 1, 0 ];
				var ang = 0;
				var axis;
				var p3 = residue.cp3;
				if(p3){
					var a2b = [ p3.x - p2.x, p3.y - p2.y, p3.z - p2.z ];
					if (p2.x === p3.x && p2.z === p3.z) {
						axis = [ 0, 0, 1 ];
						if (p2.y < p2.y) {
							ang = m.PI;
						}
					} else {
						ang = extensions.vec3AngleFrom(y, a2b);
						axis = v3.cross(y, a2b, []);
					}
					if (ang !== 0) {
						m4.rotate(transform, ang, axis);
					}
					// rotate to orientation
					var x = [ 1, 0, 0 ];
					var rM = m4.rotate(m4.identity([]), ang, axis);
					m4.multiplyVec3(rM, x);
					var p4 = residue.cp4;
					var p5 = residue.cp5;
					if (!(p4.y === p5.y && p4.z === p5.z)) {
						var pivot = [ p5.x - p4.x, p5.y - p4.y, p5.z - p4.z ];
						var ang2 = extensions.vec3AngleFrom(x, pivot);
						if (v3.dot(a2b, v3.cross(x, pivot)) < 0) {
							ang2 *= -1;
						}
						m4.rotateY(transform, ang2);
					}
					// color
					if (!specs.macro_colorByChain) {
						if (specs.nucleics_residueColor === 'shapely') {
							if (RESIDUE[residue.name]) {
								gl.material.setDiffuseColor(gl, RESIDUE[residue.name].shapelyColor);
							} else {
								gl.material.setDiffuseColor(gl, RESIDUE['*'].shapelyColor);
							}
						} else if (specs.nucleics_residueColor === 'rainbow') {
							gl.material.setDiffuseColor(gl, math.rainbowAt(i, ii, specs.macro_rainbowColors));
						}
					}
					// render
					gl.shader.setMatrixUniforms(gl, transform);
					gl.drawElements(gl.TRIANGLES, platform.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
				}
			}

		};
	};
	d3.Tube.prototype = new d3._Mesh();

	d3.CatmullTube = function(chains, thickness, cylinderResolution, horizontalResolution) {
		var chain = [];
		chains.push(chains[chains.length - 1]);
		for ( var i = 0, ii = chains.length - 2; i <= ii; i++) {
			var p0 = chains[i == 0 ? 0 : i - 1];
			var p1 = chains[i + 0];
			var p2 = chains[i + 1];
			var p3 = chains[i == ii ? i + 1 : i + 2];

			var segments = [];

			for(var j = 0; j < horizontalResolution; j++) {

				var t = j / horizontalResolution;
				if(i == ii) {
					t = j / (horizontalResolution-1);
				}

				var x = 0.5 * ((2 * p1.x) +
                      (p2.x - p0.x) * t +
                      (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t * t +
                      (3*p1.x - p0.x - 3 * p2.x + p3.x) * t * t * t);
				var y = 0.5 * ((2 * p1.y) +
                      (p2.y - p0.y) * t +
                      (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t * t +
                      (3*p1.y -p0.y - 3 * p2.y + p3.y) * t * t * t);
				var z = 0.5 * ((2 * p1.z) +
                      (p2.z - p0.z) * t +
                      (2*p0.z - 5*p1.z + 4*p2.z - p3.z) * t * t +
                      (3*p1.z -p0.z - 3 * p2.z + p3.z) * t * t * t);

				var o = new Atom('C', x, y, z);
				segments.push(o);
			}

			chain.push(segments);
		}

		var lineSegmentNum = chain[0].length;
		this.partitions = [];
		var currentPartition;
		this.ends = [];
		this.ends.push(chain[0][0]);
		this.ends.push(chain[chain.length - 1][0]);

		// calculate vertex and normal points
		var last = [ 1, 0, 0 ];
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : [],
					indexData : []
				};
				this.partitions.push(currentPartition);
			}

			var residue = chain[i];

			currentPartition.count++;
			var min = Infinity;
			// var p = new Atom('', chain[i].cp1.x, chain[i].cp1.y, chain[i].cp1.z);
			for ( var j = 0; j < lineSegmentNum; j++) {
				var currentPoint = residue[j];
				var nextPoint;
				if (j === lineSegmentNum - 1) {
					if (i === chain.length - 1) {
						nextPoint = residue[j - 1];
					} else {
						nextPoint = chain[i + 1][0];
					}
				} else {
					nextPoint = residue[j + 1];
				}

				var axis = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, nextPoint.z - currentPoint.z ];
				v3.normalize(axis);
				if (i === chain.length - 1 && j === lineSegmentNum - 1) {
					v3.scale(axis, -1);
				}
				var startVector = v3.cross(axis, last, []);
				v3.normalize(startVector);
				v3.scale(startVector, thickness / 2);
				var rotator = new PointRotator(startVector, axis, 2 * m.PI / cylinderResolution);
				for ( var k = 0, kk = cylinderResolution; k < kk; k++) {
					var use = rotator.rotate();
					if (k === m.floor(cylinderResolution / 4)) {
						last = [ use[0], use[1], use[2] ];
					}
					currentPartition.normalData.push(use[0], use[1], use[2]);
					currentPartition.positionData.push(currentPoint.x + use[0], currentPoint.y + use[1], currentPoint.z + use[2]);
				}
			}
		}

		// build mesh connectivity
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var indexStart = i * lineSegmentNum * cylinderResolution;
				for ( var j = 0, jj = lineSegmentNum; j < jj; j++) {
					var segmentIndexStart = indexStart + j * cylinderResolution;
					for ( var k = 0; k <= cylinderResolution; k++) {
						var sk = segmentIndexStart + k % cylinderResolution;
						currentPartition.indexData.push(sk, sk + cylinderResolution);
					}
				}
			}
		}

		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData, this.partitions[0].indexData);
	};
	var _ = d3.CatmullTube.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		// draw tube
		this.bindBuffers(gl);

		// render
		for ( var i = 0, ii = this.partitions.length; i < ii; i++) {
			var p = this.partitions[i];
			loadPartition(gl, p);
			// render
			gl.drawElements(gl.TRIANGLE_STRIP, p.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}

		// draw ends
		gl.sphereBuffer.bindBuffers(gl);
		for ( var i = 0; i < 2; i++) {
			var p = this.ends[i];
			var transform = m4.translate(m4.identity(), [ p.x, p.y, p.z ]);
			var radius = specs.proteins_tubeThickness / 2;
			m4.scale(transform, [ radius, radius, radius ]);
			// render
			gl.shader.setMatrixUniforms(gl, transform);
			gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
	};

})(extensions, RESIDUE, d3, m, m4, v3, math);

(function(d3, v3, undefined) {
	'use strict';
	d3.UnitCell = function(unitCellVectors) {
		this.unitCell = unitCellVectors;
		var positionData = [];
		var normalData = [];
		// calculate vertex and normal points

		var pushSide = function(p1, p2, p3, p4) {
			positionData.push(p1[0], p1[1], p1[2]);
			positionData.push(p2[0], p2[1], p2[2]);
			positionData.push(p3[0], p3[1], p3[2]);
			positionData.push(p4[0], p4[1], p4[2]);
			// push 0s for normals so shader gives them full color
			for ( var i = 0; i < 4; i++) {
				normalData.push(0, 0, 0);
			}
		};
		pushSide(unitCellVectors.o, unitCellVectors.x, unitCellVectors.xy, unitCellVectors.y);
		pushSide(unitCellVectors.o, unitCellVectors.y, unitCellVectors.yz, unitCellVectors.z);
		pushSide(unitCellVectors.o, unitCellVectors.z, unitCellVectors.xz, unitCellVectors.x);
		pushSide(unitCellVectors.yz, unitCellVectors.y, unitCellVectors.xy, unitCellVectors.xyz);
		pushSide(unitCellVectors.xyz, unitCellVectors.xz, unitCellVectors.z, unitCellVectors.yz);
		pushSide(unitCellVectors.xy, unitCellVectors.x, unitCellVectors.xz, unitCellVectors.xyz);

		// build mesh connectivity
		var indexData = [];
		for ( var i = 0; i < 6; i++) {
			var start = i * 4;
			// sides
			indexData.push(start, start + 1, start + 1, start + 2, start + 2, start + 3, start + 3, start);
		}

		this.storeData(positionData, normalData, indexData);
	};
	var _ = d3.UnitCell.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		this.bindBuffers(gl);
		// colors
		gl.material.setDiffuseColor(gl, specs.shapes_color);
		gl.lineWidth(specs.shapes_lineWidth);
		// render
		gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};

})(d3, v3);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Framebuffer = function() {
	};
	var _ = d3.Framebuffer.prototype;

	_.init = function(gl) {
		this.framebuffer = gl.createFramebuffer();
	};

	_.setColorTexture = function(gl, texture, attachment) {
		var i = attachment === undefined ? 0 : attachment;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setColorRenderbuffer = function(gl, renderbuffer, attachment) {
		var i = attachment === undefined ? 0 : attachment;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, renderbuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setDepthTexture = function(gl, texture) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setDepthRenderbuffer = function(gl, renderbuffer) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.bind = function(gl, width, height) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, width, height);
	};

})(d3, math, document);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Renderbuffer = function() {
	};
	var _ = d3.Renderbuffer.prototype;

	_.init = function(gl, format) {
		this.renderbuffer = gl.createRenderbuffer();
		this.format = format;
	};

	_.setParameter = function(gl, width, height) {
		this.width = width;
		this.height = height;
		
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, this.format, this.width, this.height);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	};

})(d3, math, document);

(function(math, d3, m, undefined) {
	'use strict';
	d3.SSAO = function() {
	};
	var _ = d3.SSAO.prototype;

	_.initSampleKernel = function(kernelSize) {
		var sampleKernel = [];

		for(var i = 0; i < kernelSize; i++) {
			var x = m.random() * 2.0 - 1.0;
			var y = m.random() * 2.0 - 1.0;
			var z = m.random() * 2.0 - 1.0;

			var scale = i / kernelSize;
			var scale2 = scale * scale;
			var lerp = 0.1 + scale2 * 0.9;

			x *= lerp;
			y *= lerp;
			z *= lerp;

			sampleKernel.push(x, y, z);
		}

		this.sampleKernel = new Float32Array(sampleKernel);
	};

	_.initNoiseTexture = function(gl) {
		var noiseSize = 16;
		var ssaoNoise = [];

		for(var i = 0; i < noiseSize; i++) {
			ssaoNoise.push(m.random() * 2 - 1);
			ssaoNoise.push(m.random() * 2 - 1);
			ssaoNoise.push(0.0);
		}

		this.noiseTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 4, 4, 0, gl.RGB, gl.FLOAT, new Float32Array(ssaoNoise));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		gl.bindTexture(gl.TEXTURE_2D, null);
	};

})(math, d3, m);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Texture = function() {
	};
	var _ = d3.Texture.prototype;

	_.init = function(gl, type, internalFormat, format) {
		this.texture = gl.createTexture();
		this.type = type;
		this.internalFormat = internalFormat;
		this.format = format !== undefined ? format : internalFormat;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
	_.setParameter = function(gl, width, height) {
		this.width = width;
		this.height = height;

		// set texture dimension
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, this.width, this.height, 0, this.format, this.type, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};

})(d3, math, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';
	d3._Shader = function() {
	};
	var _ = d3._Shader.prototype;
	_.useShaderProgram = function(gl) {
		gl.useProgram(this.gProgram);
		gl.shader = this;
	};
	_.init = function(gl) {
		var vertexShader = this.getShader(gl, 'vertex-shader');
		if (!vertexShader) {
			vertexShader = this.loadDefaultVertexShader(gl);
		}
		var fragmentShader = this.getShader(gl, 'fragment-shader');
		if (!fragmentShader) {
			fragmentShader = this.loadDefaultFragmentShader(gl);
		}

		this.gProgram = gl.createProgram();

		gl.attachShader(this.gProgram, vertexShader);
		gl.attachShader(this.gProgram, fragmentShader);
		
		this.onShaderAttached(gl);

		gl.linkProgram(this.gProgram);

		if (!gl.getProgramParameter(this.gProgram, gl.LINK_STATUS)) {
			alert('Could not initialize shaders: ' + gl.getProgramInfoLog(this.gProgram));
		}

		gl.useProgram(this.gProgram);
		this.initUniformLocations(gl);
		gl.useProgram(null);
	};
	_.onShaderAttached = function(gl) {
		// set vertex attributes explicitly
		this.vertexPositionAttribute = 0;
		this.vertexNormalAttribute = 1;

		gl.bindAttribLocation(this.gProgram, this.vertexPositionAttribute, 'a_vertex_position');
		gl.bindAttribLocation(this.gProgram, this.vertexNormalAttribute, 'a_vertex_normal');
	};
	_.getShaderFromStr = function(gl, shaderType, strSrc) {
		var shader = gl.createShader(shaderType);
		gl.shaderSource(shader, strSrc);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(shaderScript.type + ' ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return undefined;
		}
		return shader;
	};
	_.enableAttribsArray = function(gl) {
		gl.enableVertexAttribArray(this.vertexPositionAttribute);
	};
	_.disableAttribsArray = function(gl) {
		gl.disableVertexAttribArray(this.vertexPositionAttribute);
	};
	_.getShader = function(gl, id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return undefined;
		}
		var sb = [];
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType === 3) {
				sb.push(k.textContent);
			}
			k = k.nextSibling;
		}
		var sdrSrc = sb.join('');
		var shader;
		if (shaderScript.type === 'x-shader/x-fragment') {
			shader = this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sdrSrc);
		} else if (shaderScript.type === 'x-shader/x-vertex') {
			shader = this.getShaderFromStr(gl, gl.VERTEX_SHADER, sdrSrc);
		} else {
			return undefined;
		}
		return shader;
	};
	_.initUniformLocations = function(gl) {
		this.modelViewMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_model_view_matrix');
		this.projectionMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_projection_matrix');
	};
	_.loadDefaultVertexShader = function(gl) {
	};
	_.loadDefaultFragmentShader = function(gl) {
	};
	_.setMatrixUniforms = function(gl, modelMatrix) {
		if(modelMatrix === undefined) {
			this.setModelViewMatrix(gl, gl.modelViewMatrix);
		} else {
			this.setModelViewMatrix(gl, m4.multiply(gl.modelViewMatrix, modelMatrix, []));
		}
	};
	_.setProjectionMatrix = function(gl, matrix) {
		gl.uniformMatrix4fv(this.projectionMatrixUniform, false, matrix);
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		gl.uniformMatrix4fv(this.modelViewMatrixUniform, false, mvMatrix);
	};
	_.setMaterialAmbientColor = function(gl, ambient) {
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
	};
	_.setMaterialSpecularColor = function(gl, specular) {
	};
	_.setMaterialShininess = function(gl, shininess) {
	};
	_.setMaterialAlpha = function(gl, alpha) {
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.FXAAShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.FXAAShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		// assign uniform properties
		_super.initUniformLocations.call(this, gl);
		this.buffersizeUniform = gl.getUniformLocation(this.gProgram, 'u_buffersize');
		this.antialiasUniform = gl.getUniformLocation(this.gProgram, 'u_antialias');

		this.edgeThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_edge_threshold');
		this.edgeThresholdMinUniform = gl.getUniformLocation(this.gProgram, 'u_edge_threshold_min');
		this.searchStepsUniform = gl.getUniformLocation(this.gProgram, 'u_search_steps');
		this.searchThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_search_threshold');
		this.subpixCapUniform = gl.getUniformLocation(this.gProgram, 'u_subpix_cap');
		this.subpixTrimUniform = gl.getUniformLocation(this.gProgram, 'u_subpix_trim');
	};
	_.setBuffersize = function(gl, width, height) {
		gl.uniform2f(this.buffersizeUniform, width, height);
	};
	_.setAntialias = function(gl, val) {
		gl.uniform1f(this.antialiasUniform, val);
	};
	_.setEdgeThreshold = function(gl, val) {
		gl.uniform1f(this.edgeThresholdUniform, val);
	};
	_.setEdgeThresholdMin = function(gl, val) {
		gl.uniform1f(this.edgeThresholdMinUniform, val);
	};
	_.setSearchSteps = function(gl, val) {
		gl.uniform1i(this.searchStepsUniform, val);
	};
	_.setSearchThreshold = function(gl, val) {
		gl.uniform1f(this.searchThresholdUniform, val);
	};
	_.setSubpixCap = function(gl, val) {
		gl.uniform1f(this.subpixCapUniform, val);
	};
	_.setSubpixTrim = function(gl, val) {
		gl.uniform1f(this.subpixTrimUniform, val);
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};

	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		'precision mediump float;',

		'const int fxaaMaxSearchSteps = 128;',

		'uniform float u_edge_threshold;',
		'uniform float u_edge_threshold_min;',
		'uniform int u_search_steps;',
		'uniform float u_search_threshold;',
		'uniform float u_subpix_cap;',
		'uniform float u_subpix_trim;',

		'uniform sampler2D u_sampler0;',
		'uniform vec2 u_buffersize;',
		'uniform bool u_antialias;',

		'varying vec2 v_texcoord;',

		'float FxaaLuma(vec3 rgb) {',
			'return rgb.y * (0.587/0.299) + rgb.x;',
		'}',

		'vec3 FxaaLerp3(vec3 a, vec3 b, float amountOfA) {',
		    'return (vec3(-amountOfA) * b) + ((a * vec3(amountOfA)) + b);',
		'}',

		'vec4 FxaaTexOff(sampler2D tex, vec2 pos, vec2 off, vec2 rcpFrame) {',
		    'return texture2D(tex, pos + off * rcpFrame);',
		'}',

		'vec3 FxaaPixelShader(vec2 pos, sampler2D tex, vec2 rcpFrame) {',
			'float subpix_trim_scale = (1.0/(1.0 - u_subpix_trim));',
		    'vec3 rgbN = FxaaTexOff(tex, pos.xy, vec2( 0.,-1.), rcpFrame).xyz;',
		    'vec3 rgbW = FxaaTexOff(tex, pos.xy, vec2(-1., 0.), rcpFrame).xyz;',
		    'vec3 rgbM = FxaaTexOff(tex, pos.xy, vec2( 0., 0.), rcpFrame).xyz;',
		    'vec3 rgbE = FxaaTexOff(tex, pos.xy, vec2( 1., 0.), rcpFrame).xyz;',
		    'vec3 rgbS = FxaaTexOff(tex, pos.xy, vec2( 0., 1.), rcpFrame).xyz;',

		    'float lumaN = FxaaLuma(rgbN);',
		    'float lumaW = FxaaLuma(rgbW);',
		    'float lumaM = FxaaLuma(rgbM);',
		    'float lumaE = FxaaLuma(rgbE);',
		    'float lumaS = FxaaLuma(rgbS);',
		    'float rangeMin = min(lumaM, min(min(lumaN, lumaW), min(lumaS, lumaE)));',
		    'float rangeMax = max(lumaM, max(max(lumaN, lumaW), max(lumaS, lumaE)));',

		    'float range = rangeMax - rangeMin;',
		    'if(range < max(u_edge_threshold_min, rangeMax * u_edge_threshold)) {',
		        'return rgbM;',
		    '}',

		    'vec3 rgbL = rgbN + rgbW + rgbM + rgbE + rgbS;',

		    'float lumaL = (lumaN + lumaW + lumaE + lumaS) * 0.25;',
		    'float rangeL = abs(lumaL - lumaM);',
		    'float blendL = max(0.0, (rangeL / range) - u_subpix_trim) * subpix_trim_scale;',
		    'blendL = min(u_subpix_cap, blendL);',

		    'vec3 rgbNW = FxaaTexOff(tex, pos.xy, vec2(-1.,-1.), rcpFrame).xyz;',
		    'vec3 rgbNE = FxaaTexOff(tex, pos.xy, vec2( 1.,-1.), rcpFrame).xyz;',
		    'vec3 rgbSW = FxaaTexOff(tex, pos.xy, vec2(-1., 1.), rcpFrame).xyz;',
		    'vec3 rgbSE = FxaaTexOff(tex, pos.xy, vec2( 1., 1.), rcpFrame).xyz;',
		    'rgbL += (rgbNW + rgbNE + rgbSW + rgbSE);',
		    'rgbL *= vec3(1.0/9.0);',

		    'float lumaNW = FxaaLuma(rgbNW);',
		    'float lumaNE = FxaaLuma(rgbNE);',
		    'float lumaSW = FxaaLuma(rgbSW);',
		    'float lumaSE = FxaaLuma(rgbSE);',

		    'float edgeVert =',
		        'abs((0.25 * lumaNW) + (-0.5 * lumaN) + (0.25 * lumaNE)) +',
		        'abs((0.50 * lumaW ) + (-1.0 * lumaM) + (0.50 * lumaE )) +',
		        'abs((0.25 * lumaSW) + (-0.5 * lumaS) + (0.25 * lumaSE));',
		    'float edgeHorz =',
		        'abs((0.25 * lumaNW) + (-0.5 * lumaW) + (0.25 * lumaSW)) +',
		        'abs((0.50 * lumaN ) + (-1.0 * lumaM) + (0.50 * lumaS )) +',
		        'abs((0.25 * lumaNE) + (-0.5 * lumaE) + (0.25 * lumaSE));',

		    'bool horzSpan = edgeHorz >= edgeVert;',
		    'float lengthSign = horzSpan ? -rcpFrame.y : -rcpFrame.x;',

		    'if(!horzSpan) {',
		        'lumaN = lumaW;',
		        'lumaS = lumaE;',
		    '}',

		    'float gradientN = abs(lumaN - lumaM);',
		    'float gradientS = abs(lumaS - lumaM);',
		    'lumaN = (lumaN + lumaM) * 0.5;',
		    'lumaS = (lumaS + lumaM) * 0.5;',

		    'if (gradientN < gradientS) {',
		        'lumaN = lumaS;',
		        'lumaN = lumaS;',
		        'gradientN = gradientS;',
		        'lengthSign *= -1.0;',
		    '}',

		    'vec2 posN;',
		    'posN.x = pos.x + (horzSpan ? 0.0 : lengthSign * 0.5);',
		    'posN.y = pos.y + (horzSpan ? lengthSign * 0.5 : 0.0);',

		    'gradientN *= u_search_threshold;',

		    'vec2 posP = posN;',
		    'vec2 offNP = horzSpan ? vec2(rcpFrame.x, 0.0) : vec2(0.0, rcpFrame.y);',
		    'float lumaEndN = lumaN;',
		    'float lumaEndP = lumaN;',
		    'bool doneN = false;',
		    'bool doneP = false;',
		    'posN += offNP * vec2(-1.0, -1.0);',
		    'posP += offNP * vec2( 1.0,  1.0);',

		    'for(int i = 0; i < fxaaMaxSearchSteps; i++) {',
		    	'if(i >= u_search_steps) break;',
		        'if(!doneN) {',
		            'lumaEndN = FxaaLuma(texture2D(tex, posN.xy).xyz);',
		        '}',
		        'if(!doneP) {',
		            'lumaEndP = FxaaLuma(texture2D(tex, posP.xy).xyz);',
		        '}',

		        'doneN = doneN || (abs(lumaEndN - lumaN) >= gradientN);',
		        'doneP = doneP || (abs(lumaEndP - lumaN) >= gradientN);',

		        'if(doneN && doneP) {',
		            'break;',
		        '}',
		        'if(!doneN) {',
		            'posN -= offNP;',
		        '}',
		        'if(!doneP) {',
		            'posP += offNP;',
		        '}',
		    '}',

		    'float dstN = horzSpan ? pos.x - posN.x : pos.y - posN.y;',
		    'float dstP = horzSpan ? posP.x - pos.x : posP.y - pos.y;',
		    'bool directionN = dstN < dstP;',
		    'lumaEndN = directionN ? lumaEndN : lumaEndP;',

		    'if(((lumaM - lumaN) < 0.0) == ((lumaEndN - lumaN) < 0.0)) {',
		        'lengthSign = 0.0;',
		    '}',


		    'float spanLength = (dstP + dstN);',
		    'dstN = directionN ? dstN : dstP;',
		    'float subPixelOffset = (0.5 + (dstN * (-1.0/spanLength))) * lengthSign;',
		    'vec3 rgbF = texture2D(tex, vec2(',
		        'pos.x + (horzSpan ? 0.0 : subPixelOffset),',
		        'pos.y + (horzSpan ? subPixelOffset : 0.0))).xyz;',
		    'return FxaaLerp3(rgbL, rgbF, blendL);',
		'}',

		'void main() {',
			'gl_FragColor = texture2D(u_sampler0, v_texcoord);',
			'if(u_antialias) {',
				'gl_FragColor.xyz = FxaaPixelShader(v_texcoord, u_sampler0, 1. / u_buffersize).xyz;',
			'}',
		'}'
		].join('\n');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';
	d3.LabelShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.LabelShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		this.dimensionUniform = gl.getUniformLocation(this.gProgram, 'u_dimension');
	};
	_.onShaderAttached = function(gl) {
		_super.onShaderAttached.call(this, gl);
		this.vertexTexCoordAttribute = 2;
		gl.bindAttribLocation(this.gProgram, this.vertexTexCoordAttribute, 'a_vertex_texcoord');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',
		'attribute vec2 a_vertex_texcoord;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform vec2 u_dimension;',

		// sent to the fragment shader
		'varying vec2 v_texcoord;',

		'void main() {',

			'gl_Position = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'vec4 depth_pos = vec4(gl_Position);',

			'depth_pos.z += a_vertex_normal.z;',

			'gl_Position = u_projection_matrix * gl_Position;',

			'depth_pos = u_projection_matrix * depth_pos;',

			'gl_Position /= gl_Position.w;',

			'gl_Position.xy += a_vertex_normal.xy / u_dimension * 2.;',

			'gl_Position.z = depth_pos.z / depth_pos.w;',

			'v_texcoord = a_vertex_texcoord;',

		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',

		// texture for draw text nor shadow map
		'uniform sampler2D u_image;',
					
		// from the vertex shader
		'varying vec2 v_texcoord;',

		'void main(void) {',
			'gl_FragColor = texture2D(u_image, v_texcoord);',
		'}'
		].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
		gl.enableVertexAttribArray(this.vertexTexCoordAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
		gl.disableVertexAttribArray(this.vertexTexCoordAttribute);
	};
	_.setDimension = function(gl, width, height) {
		gl.uniform2f(this.dimensionUniform, width, height);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.LightingShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.LightingShader.prototype = new d3._Shader();
	
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.positionSampleUniform = gl.getUniformLocation(this.gProgram, 'u_position_sample');
		this.colorSampleUniform = gl.getUniformLocation(this.gProgram, 'u_color_sample');
		this.ssaoSampleUniform = gl.getUniformLocation(this.gProgram, 'u_ssao_sample');
		this.outlineSampleUniform = gl.getUniformLocation(this.gProgram, 'u_outline_sample');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// sent to the fragment shader
    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [

		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_position_sample;',
	    'uniform sampler2D u_color_sample;',
		'uniform sampler2D u_ssao_sample;',
		'uniform sampler2D u_outline_sample;',
	    
    	'varying vec2 v_texcoord;',

	    'void main() {',
	    	'vec4 position = texture2D(u_position_sample, v_texcoord);',
	    	'vec4 color = texture2D(u_color_sample, v_texcoord);',
			'vec4 ao = texture2D(u_ssao_sample, v_texcoord);',
			'float outline = texture2D(u_outline_sample, v_texcoord).r;',

			// skip background color
	    	'if(position.w == 0. && outline == 1.) {',
				// 'gl_FragColor = vec4(0., 0., 0., 1.);',
	    		'return;',
	    	'}',

			'gl_FragColor = vec4(color.rgb * ao.r * outline, 1.);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.NormalShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.NormalShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.normalMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_normal_matrix');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform mat3 u_normal_matrix;',

		// sent to the fragment shader
		'varying vec3 v_normal;',

		'void main() {',

			'v_normal = length(a_vertex_normal)==0. ? a_vertex_normal : u_normal_matrix * a_vertex_normal;',
			
			'gl_Position = u_projection_matrix * u_model_view_matrix * vec4(a_vertex_position, 1.);',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		
		// set float precision
		'precision mediump float;',
					
		'varying vec3 v_normal;',

		'void main(void) {',
			'vec3 normal = length(v_normal)==0. ? vec3(0., 0., 1.) : normalize(v_normal);',
			'gl_FragColor = vec4(normal, 0.);',
		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		_super.setModelViewMatrix.call(this, gl, mvMatrix);
		// create the normal matrix and push it to the graphics card
		var normalMatrix = m3.transpose(m4.toInverseMat3(mvMatrix, []));
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, normalMatrix);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.OutlineShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.OutlineShader.prototype = new d3._Shader();

	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		this.normalSampleUniform = gl.getUniformLocation(this.gProgram, 'u_normal_sample');
		this.depthSampleUniform = gl.getUniformLocation(this.gProgram, 'u_depth_sample');
		this.gbufferTextureSizeUniform = gl.getUniformLocation(this.gProgram, 'u_gbuffer_texture_size');

		this.normalThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_normal_threshold');
		this.depthThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_depth_threshold');
		this.thicknessUniform = gl.getUniformLocation(this.gProgram, 'u_thickness');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_normal_sample;',
	    'uniform sampler2D u_depth_sample;',

	    'uniform float u_normal_threshold;',
	    'uniform float u_depth_threshold;',

	    'uniform float u_thickness;',

	    'uniform vec2 u_gbuffer_texture_size;',

	    
	    'varying vec2 v_texcoord;',

	    'void main() {',
	    	'vec3 normal = texture2D(u_normal_sample, v_texcoord).xyz;',
	    	'float depth = texture2D(u_depth_sample, v_texcoord).r;',

	    	// check background pixel
	    	// 'if(depth == 1.) {',
	    	// 	'return;',
	    	// '}',

	    	'vec2 texelSize = u_thickness/u_gbuffer_texture_size * .5;',
	    	'vec2 offsets[8];',

			'offsets[0] = vec2(-texelSize.x, -texelSize.y);',
			'offsets[1] = vec2(-texelSize.x, 0);',
			'offsets[2] = vec2(-texelSize.x, texelSize.y);',

			'offsets[3] = vec2(0, -texelSize.y);',
			'offsets[4] = vec2(0,  texelSize.y);',

			'offsets[5] = vec2(texelSize.x, -texelSize.y);',
			'offsets[6] = vec2(texelSize.x, 0);',
			'offsets[7] = vec2(texelSize.x, texelSize.y);',

			'float edge = 0.;',

			'for (int i = 0; i < 8; i++) {',
				'vec3 sampleNorm = texture2D(u_normal_sample, v_texcoord + offsets[i]).xyz;',

				'if(normal == vec3(.0, .0, .0)) {',
					'if(sampleNorm != vec3(.0, .0, .0)) {',
						'edge = 1.0;',
						'break;',
					'}',
					'continue;',
				'}',

				'if (dot(sampleNorm, normal) < u_normal_threshold) {',
					'edge = 1.0;',
					'break;',
				'}',

				'float sampleDepth = texture2D(u_depth_sample, v_texcoord + offsets[i]).r;',
				'if (abs(sampleDepth - depth) > u_depth_threshold) {',
					'edge = 1.0;',
					'break;',
				'}',
			'}',

			'edge = 1. - edge;',

		    'gl_FragColor = vec4(edge, edge, edge, 1.);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.setGbufferTextureSize = function(gl, width, height) {
		gl.uniform2f(this.gbufferTextureSizeUniform, width, height);
	};
	_.setNormalThreshold = function(gl, value) {
		gl.uniform1f(this.normalThresholdUniform, value);
	};
	_.setDepthThreshold = function(gl, value) {
		gl.uniform1f(this.depthThresholdUniform, value);
	};
	_.setThickness = function(gl, value) {
		gl.uniform1f(this.thicknessUniform, value);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PhongShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PhongShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.shadowUniform = gl.getUniformLocation(this.gProgram, 'u_shadow');
		this.flatColorUniform = gl.getUniformLocation(this.gProgram, 'u_flat_color');
		this.normalMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_normal_matrix');
		
		this.lightModelViewMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_light_model_view_matrix');
		this.lightProjectionMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_light_projection_matrix');

		this.lightDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_light_diffuse_color');
		this.lightSpecularColorUniform = gl.getUniformLocation(this.gProgram, 'u_light_specular_color');
		this.lightDirectionUniform = gl.getUniformLocation(this.gProgram, 'u_light_direction');

		this.materialAmbientColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_ambient_color');
		this.materialDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_diffuse_color');
		this.materialSpecularColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_specular_color');
		this.materialShininessUniform = gl.getUniformLocation(this.gProgram, 'u_material_shininess');
		this.materialAlphaUniform = gl.getUniformLocation(this.gProgram, 'u_material_alpha');

		this.fogModeUniform = gl.getUniformLocation(this.gProgram, 'u_fog_mode');
		this.fogColorUniform = gl.getUniformLocation(this.gProgram, 'u_fog_color');
		this.fogStartUniform = gl.getUniformLocation(this.gProgram, 'u_fog_start');
		this.fogEndUniform = gl.getUniformLocation(this.gProgram, 'u_fog_end');
		this.fogDensityUniform = gl.getUniformLocation(this.gProgram, 'u_fog_density');

		// texture for shadow map
		this.shadowDepthSampleUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_depth_sample');
		this.shadowTextureSizeUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_texture_size');
		this.shadowIntensityUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_intensity');
		
		// gamma correction
		this.gammaCorrectionUniform = gl.getUniformLocation(this.gProgram, 'u_gamma_inverted');
		
		// point size
		this.pointSizeUniform = gl.getUniformLocation(this.gProgram, 'u_point_size');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',

		// scene uniforms
		'uniform vec3 u_light_diffuse_color;',
		'uniform vec3 u_material_ambient_color;',
		'uniform vec3 u_material_diffuse_color;',
		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform mat3 u_normal_matrix;',

		'uniform mat4 u_light_model_view_matrix;',
		'uniform mat4 u_light_projection_matrix;',

		'uniform bool u_shadow;',

		// sent to the fragment shader
		'varying vec3 v_viewpos;',
  		'varying vec4 v_shadcoord;',
		'varying vec3 v_diffuse;',
		'varying vec3 v_ambient;',
		'varying vec3 v_normal;',
		
		'uniform float u_point_size;',

		'void main() {',

			'v_normal = length(a_vertex_normal)==0. ? a_vertex_normal : u_normal_matrix * a_vertex_normal;',
			'v_ambient = u_material_ambient_color;',
			'v_diffuse = u_material_diffuse_color * u_light_diffuse_color;',

			'if(u_shadow) {',
				'v_shadcoord = u_light_projection_matrix * u_light_model_view_matrix * vec4(a_vertex_position, 1.);',
				'v_shadcoord /= v_shadcoord.w;',
			'}',

			'vec4 viewPos = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'v_viewpos = viewPos.xyz / viewPos.w;',
			
			'gl_Position = u_projection_matrix * viewPos;',

			// just to make sure the w is 1
			'gl_Position /= gl_Position.w;',
			'gl_PointSize = u_point_size;',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',
					
		// scene uniforms
		'uniform vec3 u_light_specular_color;',
		'uniform vec3 u_light_direction;',

		'uniform vec3 u_material_specular_color;',
		'uniform float u_material_shininess;',
		'uniform float u_material_alpha;',

		'uniform int u_fog_mode;',
		'uniform vec3 u_fog_color;',
		'uniform float u_fog_density;',
		'uniform float u_fog_start;',
		'uniform float u_fog_end;',

		'uniform bool u_shadow;',
		'uniform float u_shadow_intensity;',

		'uniform bool u_flat_color;',
		
		'uniform float u_gamma_inverted;',

		// texture for shadow map
		'uniform sampler2D u_shadow_depth_sample;',

		'uniform vec2 u_shadow_texture_size;',
					
		// from the vertex shader
		'varying vec3 v_viewpos;',
  		'varying vec4 v_shadcoord;',
		'varying vec3 v_diffuse;',
		'varying vec3 v_ambient;',
		'varying vec3 v_normal;',


		'\n#ifndef CWC_DEPTH_TEX\n',
		'float unpack (vec4 colour) {',
			'const vec4 bitShifts = vec4(1.,',
				'1. / 255.,',
				'1. / (255. * 255.),',
				'1. / (255. * 255. * 255.));',
			'return dot(colour, bitShifts);',
		'}',
		'\n#endif\n',

		'float shadowMapDepth(vec4 shadowMapColor) {',
			'float zShadowMap;',
			'\n#ifdef CWC_DEPTH_TEX\n',
			'zShadowMap = shadowMapColor.r;',
			'\n#else\n',
			'zShadowMap = unpack(shadowMapColor);',
			'\n#endif\n',
			'return zShadowMap;',
		'}',

		'void main(void) {',
			'vec3 color = v_diffuse;',
			'if(length(v_normal)!=0.){',
				'vec3 normal = normalize(v_normal);',
				'vec3 lightDir = normalize(-u_light_direction);',
				'float nDotL = dot(normal, lightDir);',

    			'float shadow = 0.0;',
    			'if(u_shadow) {',
					'vec3 depthCoord = .5 + v_shadcoord.xyz / v_shadcoord.w * .5;',

				    'if(depthCoord.z <= 1. && depthCoord.z >= 0.) {',
						'float bias = max(.05 * (1. - nDotL), .005);',
						'vec2 texelSize = 1. / u_shadow_texture_size;',
					    'for(int x = -1; x <= 1; ++x) {',
					        'for(int y = -1; y <= 1; ++y)  {',
								'vec4 shadowMapColor = texture2D(u_shadow_depth_sample, depthCoord.xy + vec2(x, y) * texelSize);',
								'float zShadowMap = shadowMapDepth(shadowMapColor);',
					            'shadow += zShadowMap + bias < depthCoord.z ? 1. : 0.;',
					        '}',
					    '}',
					    'shadow /= 9.;',
					    'shadow *= u_shadow_intensity;',
					'}',
    			'}',

    			'if(!u_flat_color) {',
					'vec3 viewDir = normalize(-v_viewpos);',
					'vec3 halfDir = normalize(lightDir + viewDir);',
					'float nDotHV = max(dot(halfDir, normal), 0.);',
					'vec3 specular = u_material_specular_color * u_light_specular_color;',
					'color*=max(nDotL, 0.);',
					'color+=specular * pow(nDotHV, u_material_shininess);',
				'}',

				// set the color
				'color = (1.-shadow)*color+v_ambient;',
			'}',

			'gl_FragColor = vec4(pow(color, vec3(u_gamma_inverted)), u_material_alpha);',

			'if(u_fog_mode != 0){',
				'float fogCoord = 1.-clamp((u_fog_end - gl_FragCoord.z/gl_FragCoord.w) / (u_fog_end - u_fog_start), 0., 1.);',
				'float fogFactor = 1.;',

				// linear equation
				'if(u_fog_mode == 1){',
					'fogFactor = 1.-fogCoord;',
				'}',
				// exp equation
				'else if(u_fog_mode == 2) {',
					'fogFactor = clamp(exp(-u_fog_density*fogCoord), 0., 1.);',
				'}',
				// exp2 equation
				'else if(u_fog_mode == 3) {',
					'fogFactor = clamp(exp(-pow(u_fog_density*fogCoord, 2.)), 0., 1.);',
				'}',
				'gl_FragColor = mix(vec4(u_fog_color, 1.), gl_FragColor, fogFactor);',

				// for debugging
				// 'gl_FragColor = vec4(vec3(fogFactor), 1.);',
			'}',
		'}'
		].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.setMatrixUniforms = function(gl, modelMatrix) {
		if(modelMatrix === undefined) {
			this.setModelViewMatrix(gl, gl.modelViewMatrix);
			this.setLightModelViewMatrix(gl, gl.lightViewMatrix);
		} else {
			var mvMatrix = m4.multiply(gl.modelViewMatrix, modelMatrix, []);
			var lightModelViewMatrix = m4.multiply(gl.lightViewMatrix, modelMatrix, []);

			this.setModelViewMatrix(gl, mvMatrix);
			this.setLightModelViewMatrix(gl, lightModelViewMatrix);
		}
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		_super.setModelViewMatrix.call(this, gl, mvMatrix);
		// create the normal matrix and push it to the graphics card
		var normalMatrix = m3.transpose(m4.toInverseMat3(mvMatrix, []));
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, normalMatrix);
	};
	_.setFlatColor = function(gl, enabled) {
		gl.uniform1i(this.flatColorUniform, enabled);
	};
	_.setShadow = function(gl, enabled) {
		gl.uniform1i(this.shadowUniform, enabled);
	};
	_.setFogMode = function(gl, mode) {
		gl.uniform1i(this.fogModeUniform, mode);
	};
	_.setFogColor = function(gl, color) {
		gl.uniform3fv(this.fogColorUniform, color);
	};
	_.setFogStart = function(gl, fogStart) {
		gl.uniform1f(this.fogStartUniform, fogStart);
	};
	_.setFogEnd = function(gl, fogEnd) {
		gl.uniform1f(this.fogEndUniform, fogEnd);
	};
	_.setFogDensity = function(gl, density) {
		gl.uniform1f(this.fogDensityUniform, density);
	};
	_.setMaterialAmbientColor = function(gl, ambient) {
		gl.uniform3fv(this.materialAmbientColorUniform, ambient);
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.materialDiffuseColorUniform, diffuse);
	};
	_.setMaterialSpecularColor = function(gl, specular) {
		gl.uniform3fv(this.materialSpecularColorUniform, specular);
	};
	_.setMaterialShininess = function(gl, shininess) {
		gl.uniform1f(this.materialShininessUniform, shininess);
	};
	_.setMaterialAlpha = function(gl, alpha) {
		gl.uniform1f(this.materialAlphaUniform, alpha);
	};
	_.setLightDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.lightDiffuseColorUniform, diffuse);
	};
	_.setLightSpecularColor = function(gl, specular) {
		gl.uniform3fv(this.lightSpecularColorUniform, specular);
	};
	_.setLightDirection = function(gl, direction) {
		gl.uniform3fv(this.lightDirectionUniform, direction);
	};
	_.setLightModelViewMatrix = function(gl, mvMatrix) {
		gl.uniformMatrix4fv(this.lightModelViewMatrixUniform, false, mvMatrix);
	};
	_.setLightProjectionMatrix = function(gl, matrix) {
		gl.uniformMatrix4fv(this.lightProjectionMatrixUniform, false, matrix);
	};
	_.setShadowTextureSize = function(gl, width, height) {
		gl.uniform2f(this.shadowTextureSizeUniform, width, height);
	};
	_.setShadowIntensity = function(gl, intensity) {
		gl.uniform1f(this.shadowIntensityUniform, intensity);
	};
	_.setGammaCorrection = function(gl, gammaCorrection) {
	    // make sure gamma correction is inverted here as it is more efficient in the shader
		gl.uniform1f(this.gammaCorrectionUniform, 1.0/gammaCorrection);
	};
	_.setPointSize = function(gl, pointSize) {
		gl.uniform1f(this.pointSizeUniform, pointSize);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PickShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PickShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		// assign uniform properties
		_super.initUniformLocations.call(this, gl);
		this.materialDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_diffuse_color');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',

		'void main() {',
			
			'gl_Position = u_projection_matrix * u_model_view_matrix * vec4(a_vertex_position, 1.);',

			// just to make sure the w is 1
			'gl_Position /= gl_Position.w;',

		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',

		'uniform vec3 u_material_diffuse_color;',
					
		'void main(void) {',
			'gl_FragColor = vec4(u_material_diffuse_color, 1.);',
		'}'
		].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.materialDiffuseColorUniform, diffuse);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PositionShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PositionShader.prototype = new d3._Shader();

	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',

		'varying vec4 v_position;',

		'void main() {',
			'vec4 viewPos = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'gl_Position = u_projection_matrix * viewPos;',

			'v_position = viewPos / viewPos.w;',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set float precision
		'precision mediump float;',

		'varying vec4 v_position;',

		'void main(void) {',
			'gl_FragColor = v_position;',
		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(d3, m3, m4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.QuadShader = function() {
	};
	var _ = d3.QuadShader.prototype = new d3._Shader();
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [

		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_image;',

    	'varying vec2 v_texcoord;',
	    
	    'void main() {',
	        'gl_FragColor = texture2D(u_image, v_texcoord);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(d3, m3, m4, document);

(function(d3, ELEMENT, MarchingCubes, v3, m, undefined) {
	'use strict';
	
	var Triangle = function(i1, i2, i3){
		this.i1 = i1;
		this.i2 = i2;
		this.i3 = i3;
	};
	
	function getRange(atoms, probeRadius) {
		var r = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
		var add = probeRadius + 2;
		for (var i = 0, ii = atoms.length; i<ii; i++) {
			var a = atoms[i];
			r[0] = m.min(r[0], a.x - add);
			r[1] = m.max(r[1], a.x + add);
			r[2] = m.min(r[2], a.y - add);
			r[3] = m.max(r[3], a.y + add);
			r[4] = m.min(r[4], a.z - add);
			r[5] = m.max(r[5], a.z + add);
		}
		return r;
	};
	
	function addPoint(p, points, xs, ys, zs, step) {
		// transform back into real space
		var px = p[0] * step + xs - step;
		var py = p[1] * step + ys - step;
		var pz = p[2] * step + zs - step;
		// find any previous match
		var index = -1;
		var cutoff = 1E-3;
		for (var j = 0, jj = points.length; j < jj; j++) {
			var pj = points[j];
			if (m.abs(pj.x - px) < cutoff && m.abs(pj.y - py) < cutoff && m.abs(pj.z - pz) < cutoff) {
				index = j;
				break;
			}
		}
		if (index == -1) {
			index = points.length;
			points.push(new Atom('C', px, py, pz));
		}
		return index;
	};
	
	d3._Surface = function() {
	};
	var _ = d3._Surface.prototype = new d3._Mesh();
	_.generate = function(xdif, ydif, zdif, step, range, xsteps, ysteps, zsteps){
		// generate the function
		var vals = [];
		var z = range[4] - step;
		for (var k = 0; k < zsteps; k++) {
			var y = range[2] - step;
			for (var j = 0; j < ysteps; j++) {
				var x = range[0] - step;
				for (var i = 0; i < xsteps; i++) {
					vals.push(this.calculate(x, y, z));
					x += step;
				}
				y += step;
			}
			z += step;
		}
		return vals;
	};
	_.build = function(atoms, probeRadius, resolution) {
		var positionData = [];
		var normalData = [];
		var indexData = [];

		// calculate the range of the function
		var range = getRange(atoms, probeRadius);
		var xdif = range[1] - range[0];
		var ydif = range[3] - range[2];
		var zdif = range[5] - range[4];
		var step = m.min(xdif, m.min(ydif, zdif)) / resolution;
		
		// generate the function
		var xsteps = 2 + m.ceil(xdif / step);
		var ysteps = 2 + m.ceil(ydif / step);
		var zsteps = 2 + m.ceil(zdif / step);
		var vals = this.generate(xdif, ydif, zdif, step, range, xsteps, ysteps, zsteps);
		
		// marching cubes
		var mesh = MarchingCubes(vals, [xsteps, ysteps, zsteps]);
		
		// build surface
		var ps = [];
		var is = [];
		for (var i = 0, ii = mesh.vertices.length; i<ii; i++) {
			is.push(addPoint(mesh.vertices[i], ps, range[0], range[2], range[4], step));
		}
		
		// triangles
		var triangles = [];
		for (var i = 0, ii = mesh.faces.length; i < ii; i++) {
			var f = mesh.faces[i];
			var i1 = is[f[0]];
			var i2 = is[f[1]];
			var i3 = is[f[2]];
			triangles.push(new Triangle(i1, i2, i3));
			indexData.push(i1, i2, i3);
		}
		
		// smoothing - 1 pass
		var savedConnections = [];
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var connections = [];
			for (var j = 0, jj = triangles.length; j < jj; j++) {
				var t = triangles[j];
				if (t.i1===i || t.i2===i || t.i3===i) {
					if (t.i1 != i && connections.indexOf(t.i1)===-1) {
						connections.push(t.i1);
					}
					if (t.i2 != i && connections.indexOf(t.i2)===-1) {
						connections.push(t.i2);
					}
					if (t.i3 != i && connections.indexOf(t.i3)===-1) {
						connections.push(t.i3);
					}
				}
			}
			savedConnections.push(connections);
		}
		var tmp = [];
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var pi = ps[i];
			var connections = savedConnections[i];
			var pt = new Atom();
			if (connections.length < 3) {
				pt.x = pi.x;
				pt.y = pi.y;
				pt.z = pi.z;
			} else {
				var wt = 1;
				if (connections.length < 5) {
					wt = .5;
				}
				for (var j = 0, jj = connections.length; j < jj; j++) {
					var pc = ps[connections[j]];
					pt.x+=pc.x;
					pt.y+=pc.y;
					pt.z+=pc.z;
				}
				pt.x += pi.x*wt;
				pt.y += pi.y*wt;
				pt.z += pi.z*wt;
				var scale = 1 / (wt + connections.length);
				pt.x*=scale;
				pt.y*=scale;
				pt.z*=scale;
			}
			tmp.push(pt);
		}
		ps = tmp;
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var pi = ps[i];
			positionData.push(pi.x, pi.y, pi.z);
		}
		
		// normals
		for (var i = 0, ii = triangles.length; i < ii; i++) {
			var t = triangles[i];
			var p1 = ps[t.i1];
			var p2 = ps[t.i2];
			var p3 = ps[t.i3];
			var v12 = [p2.x-p1.x, p2.y-p1.y, p2.z-p1.z];
			var v13 = [p3.x-p1.x, p3.y-p1.y, p3.z-p1.z];
			v3.cross(v12, v13);
			if (isNaN(v12[0])) {
				// for some reason, origin shows up as some points and should be
				// ignored
				v12 = [0,0,0];
			}
			t.normal = v12;
		}
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var sum = [0, 0, 0];
			for (var j = 0, jj = triangles.length; j < jj; j++) {
				var t = triangles[j];
				if (t.i1===i || t.i2===i || t.i3===i) {
					sum[0]+=t.normal[0];
					sum[1]+=t.normal[1];
					sum[2]+=t.normal[2];
				}
			}
			v3.normalize(sum);
			normalData.push(sum[0], sum[1], sum[2]);
		}
		this.storeData(positionData, normalData, indexData);
	};
	_.render = function(gl, specs) {
		if(this.specs){
			specs = this.specs;
		}
		if(!specs.surfaces_display){
			return;
		}
		gl.shader.setMatrixUniforms(gl);
		this.bindBuffers(gl);
		// colors
		gl.material.setTempColors(gl, specs.surfaces_materialAmbientColor_3D, specs.surfaces_color, specs.surfaces_materialSpecularColor_3D, specs.surfaces_materialShininess_3D);
		// alpha must be set after temp colors as that function sets alpha to 1
		gl.material.setAlpha(gl, specs.surfaces_alpha);
		// render
		if(specs.surfaces_style === 'Dots'){
			// dots
			//gl.pointSize(1);
			// pointSize isn't part of WebGL API, so we have to make it a shader uniform in the vertex shader
			gl.shader.setPointSize(gl, specs.shapes_pointSize);
			//gl.drawArrays(gl.POINTS, 0, this.vertexIndexBuffer.numItems);
			gl.drawElements(gl.POINTS, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}else if(specs.surfaces_style === 'Mesh'){
			// mesh
			gl.lineWidth(specs.shapes_lineWidth);
			//gl.polygonMode(gl.FRONT_AND_BACK, gl.LINE);
			gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			//gl.polygonMode(gl.FRONT_AND_BACK, gl.FILL);
		}else{
			// solid
			gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
		
	};

})(d3, ELEMENT, MarchingCubes, v3, m);

(function(d3, ELEMENT, m, undefined) {
	'use strict';
	
	d3.SASSurface = function(atoms, probeRadius, resolution) {
		this.atoms = atoms;
		this.probeRadius = probeRadius;
		this.resolution = resolution;
		this.build(atoms, probeRadius, resolution);
	};
	var _ = d3.SASSurface.prototype = new d3._Surface();
	_.calculate = function(x, y, z) {
		var min = Infinity;
		var p = new Atom('C', x, y, z);
		for (var i = 0, ii = this.atoms.length; i<ii; i++) {
			var a = this.atoms[i];
			var vdwRadius = (ELEMENT[a.label] && ELEMENT[a.label].vdWRadius!==0)?ELEMENT[a.label].vdWRadius:2;
			var distanceCenter = a.distance3D(p) - this.probeRadius;
			var distanceSurface = distanceCenter - vdwRadius;
			min = m.min(min, distanceSurface);
		}
		return min;
	};
	

})(d3, ELEMENT, m);

(function(d3, ELEMENT, m, undefined) {
	'use strict';
	
	d3.VDWSurface = function(atoms, resolution) {
		this.atoms = atoms;
		this.probeRadius = 0;
		this.resolution = resolution;
		this.build(atoms, 0, resolution);
	};
	var _ = d3.VDWSurface.prototype = new d3._Surface();
	_.calculate = function(x, y, z) {
		var min = Infinity;
		var p = new Atom('C', x, y, z);
		for (var i = 0, ii = this.atoms.length; i<ii; i++) {
			var a = this.atoms[i];
			var vdwRadius = (ELEMENT[a.label] && ELEMENT[a.label].vdWRadius!==0)?ELEMENT[a.label].vdWRadius:2;
			var distanceCenter = a.distance3D(p);
			var distanceSurface = distanceCenter - vdwRadius;
			min = m.min(min, distanceSurface);
		}
		return min;
	};
	

})(d3, ELEMENT, m);
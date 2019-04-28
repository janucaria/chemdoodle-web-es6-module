import { RESIDUE } from '../ChemDoodle';
import * as math from './math';
import * as extensions from './extensions';
import monitor from './monitor';
import {
  Point,
  Atom,
  d3
} from './structures';
import {
  jQuery as q,
  mat3 as m3,
  mat4 as m4,
  vec3 as v3
} from './lib';
import _Canvas from './_Canvas';
import { MovieCanvas3D } from '../ChemDoodle';

const m = Math;

export default function _Canvas3D(id, width, height) {
  if (id) {
    this.create(id, width, height);
  }
};
var _ = _Canvas3D.prototype = new _Canvas();
var _super = _Canvas.prototype;
_.rotationMatrix = undefined;
_.lastPoint = undefined;
_.emptyMessage = 'WebGL is Unavailable!';
_.lastPinchScale = 1;
_.lastGestureRotate = 0;
_.afterLoadContent = function() {
  var bounds = new math.Bounds();
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    bounds.expand(this.molecules[i].getBounds3D());
  }
  // build fog parameter
  var maxDimension3D = v3.dist([ bounds.maxX, bounds.maxY, bounds.maxZ ], [ bounds.minX, bounds.minY, bounds.minZ ]) / 2 + 1.5;
  if(maxDimension3D===Infinity){
    // there is no content
    maxDimension3D = 10;
  }
  
  this.maxDimension = m.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

  var fov         = m.min(179.9, m.max(this.specs.projectionPerspectiveVerticalFieldOfView_3D, 0.1));
  var theta       = fov / 360 * m.PI;
  var tanTheta    = m.tan(theta) / 0.8;
  var top         = maxDimension3D;
  var focalLength = top / tanTheta;
  var near        = focalLength - top;
  var far         = focalLength + top;
  var aspect      = this.width / this.height;

  this.camera.fieldOfView = fov;
  this.camera.near = near;
  this.camera.far = far;
  this.camera.aspect = aspect;
  m4.translate(m4.identity(this.camera.viewMatrix), [ 0, 0, -focalLength]);

  var lightFocalLength = top / m.tan(theta);
  
  this.lighting.camera.fieldOfView = fov;
  this.lighting.camera.near = lightFocalLength - top;
  this.lighting.camera.far = lightFocalLength + top;
  this.lighting.updateView();

  this.setupScene();
};
_.renderDepthMap = function() {
  if (this.specs.shadow_3D && d3.DepthShader) {

    var cullFaceEnabled = this.gl.isEnabled(this.gl.CULL_FACE);
    if(!cullFaceEnabled) { this.gl.enable(this.gl.CULL_FACE); }

    this.depthShader.useShaderProgram(this.gl);

    // current clear color
    var cs = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);

    this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

    this.lightDepthMapFramebuffer.bind(this.gl, this.shadowTextureSize, this.shadowTextureSize);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // use light projection matrix to draw the molecule
    this.depthShader.setProjectionMatrix(this.gl, this.lighting.camera.projectionMatrix);

    this.depthShader.enableAttribsArray(this.gl);

    for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
      this.molecules[i].render(this.gl, this.specs);
    }

    this.gl.flush();

    this.depthShader.disableAttribsArray(this.gl);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    // set back the clear color
    this.gl.clearColor(cs[0], cs[1], cs[2], cs[3]);

    if(!cullFaceEnabled) { this.gl.disable(this.gl.CULL_FACE); }
  }
};// draw anything those not molecules, example compass, shapes, text etc.
_.renderExtras = function() {

  this.phongShader.useShaderProgram(this.gl);

  this.phongShader.enableAttribsArray(this.gl);

  var transparentShapes = [];
  for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
    var s = this.shapes[i];
    if(s instanceof d3._Surface && (!s.specs && this.specs.surfaces_alpha!==1 || s.specs && s.specs.surfaces_alpha!==1)){
      transparentShapes.push(s);
    }else{
      s.render(this.gl, this.specs);
    }
  }
  
  // transparent shapes
  if(transparentShapes.length!==0){
    //this.gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);
    this.gl.depthMask(false);
    for ( var i = 0, ii = transparentShapes.length; i < ii; i++) {
      var s = transparentShapes[i];
      s.render(this.gl, this.specs);
    }
    this.gl.depthMask(true);
    this.gl.disable(this.gl.BLEND);
    this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);		
  }
  

  this.phongShader.setShadow(this.gl, false);
  this.phongShader.setFogMode(this.gl, 0);
  this.phongShader.setFlatColor(this.gl, false);

  // compass use its own model view and projection matrix
  // so it need to use back the default matrix for other
  // rendering process (ex. render arbitrary text).
  if (this.specs.compass_display) {
    this.phongShader.setLightDirection(this.gl, [0, 0, -1]);
    this.compass.render(this.gl, this.specs);
  }

  this.phongShader.disableAttribsArray(this.gl);

  this.gl.flush();

  // enable blend and depth mask set to false
  this.gl.enable(this.gl.BLEND);
  this.gl.depthMask(false);
  this.labelShader.useShaderProgram(this.gl);
  // use back the default model view matrix
  this.labelShader.setMatrixUniforms(this.gl, this.gl.modelViewMatrix);
  // use back the default projection matrix
  this.labelShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);
  this.labelShader.setDimension(this.gl, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);

  // enable vertex for draw text
  this.labelShader.enableAttribsArray(this.gl);

  // draw label molecule
  if (this.specs.atoms_displayLabels_3D) {
    this.label3D.render(this.gl, this.specs, this.getMolecules());
  }
  // draw measurement text
  if(this.specs.measurement_displayText_3D) {
    for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
      var s = this.shapes[i];
      if(s.renderText){
        s.renderText(this.gl, this.specs);
      }
    }
  }
  // draw compass X Y Z text
  if (this.specs.compass_display && this.specs.compass_displayText_3D) {
    this.compass.renderAxis(this.gl);
  }
  // disable vertex for draw text
  this.labelShader.disableAttribsArray(this.gl);

  // disable blend and depth mask set to true
  this.gl.disable(this.gl.BLEND);
  this.gl.depthMask(true);
  this.gl.flush();
  
  if (this.drawChildExtras) {
    this.drawChildExtras(this.gl);
  }

  this.gl.flush();
};
// molecule colors rendeing will both use on forward and deferred rendering
_.renderColor = function() {
  this.phongShader.useShaderProgram(this.gl);

  this.gl.uniform1i(this.phongShader.shadowDepthSampleUniform, 0);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightDepthMapTexture.texture);

  this.phongShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);
  this.phongShader.setShadow(this.gl, this.specs.shadow_3D);
  this.phongShader.setFlatColor(this.gl, this.specs.flat_color_3D);
  this.phongShader.setGammaCorrection(this.gl, this.specs.gammaCorrection_3D);

  this.phongShader.setShadowTextureSize(this.gl, this.shadowTextureSize, this.shadowTextureSize);
  this.phongShader.setShadowIntensity(this.gl, this.specs.shadow_intensity_3D);

  this.phongShader.setFogMode(this.gl, this.specs.fog_mode_3D);
  this.phongShader.setFogColor(this.gl, this.fogging.colorRGB);
  this.phongShader.setFogStart(this.gl, this.fogging.fogStart);
  this.phongShader.setFogEnd(this.gl, this.fogging.fogEnd);
  this.phongShader.setFogDensity(this.gl, this.fogging.density);

  this.phongShader.setLightProjectionMatrix(this.gl, this.lighting.camera.projectionMatrix);
  this.phongShader.setLightDiffuseColor(this.gl, this.lighting.diffuseRGB);
  this.phongShader.setLightSpecularColor(this.gl, this.lighting.specularRGB);
  this.phongShader.setLightDirection(this.gl, this.lighting.direction);
  
  this.phongShader.enableAttribsArray(this.gl);

  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    this.molecules[i].render(this.gl, this.specs);
  }

  this.phongShader.disableAttribsArray(this.gl);

  this.gl.flush();
};
_.renderPosition = function() {
  this.positionShader.useShaderProgram(this.gl);

  this.positionShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

  this.positionShader.enableAttribsArray(this.gl);

  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    this.molecules[i].render(this.gl, this.specs);
  }

  this.positionShader.disableAttribsArray(this.gl);

  this.gl.flush();
};
_.renderNormal = function() {
  this.normalShader.useShaderProgram(this.gl);
  this.normalShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

  this.normalShader.enableAttribsArray(this.gl);

  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    this.molecules[i].render(this.gl, this.specs);
  }

  this.normalShader.disableAttribsArray(this.gl);

  this.gl.flush();
};
_.renderSSAO = function() {
  this.ssaoShader.useShaderProgram(this.gl);

  this.ssaoShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

  this.ssaoShader.setSampleKernel(this.gl, this.ssao.sampleKernel);

  this.ssaoShader.setKernelRadius(this.gl, this.specs.ssao_kernel_radius);

  this.ssaoShader.setPower(this.gl, this.specs.ssao_power);

  this.ssaoShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.uniform1i(this.ssaoShader.positionSampleUniform, 0);
  this.gl.uniform1i(this.ssaoShader.normalSampleUniform, 1);
  this.gl.uniform1i(this.ssaoShader.noiseSampleUniform, 2);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE2);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssao.noiseTexture);

  this.gl.activeTexture(this.gl.TEXTURE0);

  this.ssaoShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.ssaoShader.disableAttribsArray(this.gl);

  this.gl.flush();

  // render ssao blur shader
  this.ssaoFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.ssaoBlurShader.useShaderProgram(this.gl);

  this.ssaoBlurShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.uniform1i(this.ssaoBlurShader.aoSampleUniform, 0);
  this.gl.uniform1i(this.ssaoBlurShader.depthSampleUniform, 1);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture.texture);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture.texture);
  this.gl.activeTexture(this.gl.TEXTURE0);


  this.ssaoBlurShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.ssaoBlurShader.disableAttribsArray(this.gl);

  this.gl.activeTexture(this.gl.TEXTURE0);

  this.gl.flush();
};
_.renderOutline = function() {
  this.outlineShader.useShaderProgram(this.gl);

  this.outlineShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.outlineShader.setNormalThreshold(this.gl, this.specs.outline_normal_threshold);
  this.outlineShader.setDepthThreshold(this.gl, this.specs.outline_depth_threshold);
  this.outlineShader.setThickness(this.gl, this.specs.outline_thickness);

  this.gl.uniform1i(this.outlineShader.normalSampleUniform, 0);
  this.gl.uniform1i(this.outlineShader.depthSampleUniform, 1);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE0);

  this.outlineShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.outlineShader.disableAttribsArray(this.gl);

  this.gl.flush();
};
_.deferredRender = function() {
  // get backdground color
  var bgColor = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);
  // set background to black
  this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

  // render color
  this.colorFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.renderColor();

  // render position
  this.positionFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.renderPosition();

  // render normals
  this.normalFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.renderNormal();

  // render ssao
  if(this.specs.ssao_3D && d3.SSAOShader) {
    // render ssao shading
    this.quadFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.renderSSAO();
  } else {
    this.ssaoFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  // render outline
  this.outlineFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  if(this.specs.outline_3D) {
    this.renderOutline();
  }

  // set back background color
  this.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
  // composite render
  this.quadFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  
  this.lightingShader.useShaderProgram(this.gl);

  this.gl.uniform1i(this.lightingShader.positionSampleUniform, 0);
  this.gl.uniform1i(this.lightingShader.colorSampleUniform, 1);
  this.gl.uniform1i(this.lightingShader.ssaoSampleUniform, 2);
  this.gl.uniform1i(this.lightingShader.outlineSampleUniform, 3);

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE2);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE3);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.outlineTexture.texture);

  this.gl.activeTexture(this.gl.TEXTURE0);

  this.lightingShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.lightingShader.disableAttribsArray(this.gl);

  this.gl.flush();

  // final render
  this.fxaaFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  // setup viewport
  this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture.texture);

  this.fxaaShader.useShaderProgram(this.gl);

  this.fxaaShader.setBuffersize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.fxaaShader.setAntialias(this.gl, this.specs.antialias_3D);

  this.fxaaShader.setEdgeThreshold(this.gl, this.specs.fxaa_edgeThreshold);
  this.fxaaShader.setEdgeThresholdMin(this.gl, this.specs.fxaa_edgeThresholdMin);
  this.fxaaShader.setSearchSteps(this.gl, this.specs.fxaa_searchSteps);
  this.fxaaShader.setSearchThreshold(this.gl, this.specs.fxaa_searchThreshold);
  this.fxaaShader.setSubpixCap(this.gl, this.specs.fxaa_subpixCap);
  this.fxaaShader.setSubpixTrim(this.gl, this.specs.fxaa_subpixTrim);

  this.fxaaShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.fxaaShader.disableAttribsArray(this.gl);

  this.gl.flush();


  // final render
  this.finalFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  this.renderExtras();

  // set back background color
  this.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

  // last render
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  // setup viewport
  this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.bindTexture(this.gl.TEXTURE_2D, this.fxaaTexture.texture);

  this.quadShader.useShaderProgram(this.gl);

  this.quadShader.enableAttribsArray(this.gl);

  this.gl.quadBuffer.bindBuffers(this.gl);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

  this.quadShader.disableAttribsArray(this.gl);

  this.gl.flush();
};
_.forwardRender = function() {
  // last render
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  // setup viewport
  this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.renderColor();

  this.renderExtras();
};
_.repaint = function() {
  if (this.gl) {
    // set up the model view matrix to the specified transformations
    this.gl.lightViewMatrix = m4.multiply(this.lighting.camera.viewMatrix, this.rotationMatrix, []);
    this.gl.rotationMatrix = this.rotationMatrix;
    this.gl.modelViewMatrix = this.gl.lightViewMatrix;

    this.renderDepthMap();

    this.gl.modelViewMatrix = m4.multiply(this.camera.viewMatrix, this.rotationMatrix, []);

    if(this.isSupportDeferred() && (this.specs.ssao_3D || this.specs.outline_3D)) {
      this.deferredRender();
    } else {
      this.forwardRender();
    }
  }
};
_.pick = function(x, y, includeAtoms, includeBonds) {
  if (this.gl) {
    // draw with pick framebuffer
    var xu = x;
    var yu = this.height - y;
    if (this.pixelRatio !== 1) {
      xu *= this.pixelRatio;
      yu *= this.pixelRatio;
    }

    // set up the model view matrix to the specified transformations
    m4.multiply(this.camera.viewMatrix, this.rotationMatrix, this.gl.modelViewMatrix);
    this.gl.rotationMatrix = this.rotationMatrix;

    this.pickShader.useShaderProgram(this.gl);
    
    // current clear color
    var cs = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);

    this.gl.clearColor(1.0, 1.0, 1.0, 0.0);
    this.pickerFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // use default projection matrix to draw the molecule
    this.pickShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

    // not need the normal for diffuse light, we need flat color
    this.pickShader.enableAttribsArray(this.gl);

    var objects = [];

    for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
      this.molecules[i].renderPickFrame(this.gl, this.specs, objects, includeAtoms, includeBonds);
    }

    this.pickShader.disableAttribsArray(this.gl);

    this.gl.flush();

    var rgba = new Uint8Array(4);
    this.gl.readPixels(xu - 2, yu + 2, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, rgba);

    var object = undefined;
    var idxMolecule = rgba[3];
    if (idxMolecule > 0) {
      var idxAtom = rgba[2] | (rgba[1] << 8) | (rgba[0] << 16);
      object = objects[idxAtom];
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    // set back the clear color
    this.gl.clearColor(cs[0], cs[1], cs[2], cs[3]);
    return object;
  }
  return undefined;
};
_.center = function() {
  var p = new Atom();
  for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
    var m = this.molecules[k];
    p.add3D(m.getCenter3D());
  }
  p.x /= this.molecules.length;
  p.y /= this.molecules.length;
  for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
    var m = this.molecules[k];
    for ( var i = 0, ii = m.atoms.length; i < ii; i++) {
      m.atoms[i].sub3D(p);
    }
    if (m.chains && m.fromJSON) {
      for ( var i = 0, ii = m.chains.length; i < ii; i++) {
        var chain = m.chains[i];
        for ( var j = 0, jj = chain.length; j < jj; j++) {
          var residue = chain[j];
          residue.cp1.sub3D(p);
          residue.cp2.sub3D(p);
          if (residue.cp3) {
            residue.cp3.sub3D(p);
            residue.cp4.sub3D(p);
            residue.cp5.sub3D(p);
          }
        }
      }
    }
  }
};
_.isSupportDeferred = function() {
  return this.gl.textureFloatExt && this.gl.depthTextureExt;
};
_.create = function(id, width, height) {
  _super.create.call(this, id, width, height);
  // setup gl object
  try {
    var canvas = document.getElementById(this.id);
    this.gl = canvas.getContext('webgl');
    if (!this.gl) {
      this.gl = canvas.getContext('experimental-webgl');
    }
  } catch (e) {
  }
  if (this.gl) {
  
    if (this.pixelRatio !== 1 && this.gl.canvas.width === this.width) {
      this.gl.canvas.style.width = this.width + 'px';
      this.gl.canvas.style.height = this.height + 'px';
      this.gl.canvas.width = this.width * this.pixelRatio;
      this.gl.canvas.height = this.height * this.pixelRatio;
    }

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearDepth(1.0);

    // size of texture for render depth map from light view
    this.shadowTextureSize = 1024;
    // setup matrices
    this.rotationMatrix = m4.identity([]);
    // set up camera
    this.camera = new d3.Camera();

    this.label3D = new d3.Label();

    this.lighting = new d3.Light(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
    
    this.fogging = new d3.Fog(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
    
    
    // uncomment this line to see shadow without depth texture extension
    this.gl.depthTextureExt = this.gl.getExtension('WEBGL_depth_texture') || this.gl.getExtension('WEBKIT_WEBGL_depth_texture') || this.gl.getExtension('MOZ_WEBGL_depth_texture');
    this.gl.textureFloatExt = this.gl.getExtension('OES_texture_float') || this.gl.getExtension('WEBKIT_OES_texture_float') || this.gl.getExtension('MOZ_OES_texture_float');
    // this.gl.shaderTextureLodExt = this.gl.getExtension('EXT_shader_texture_lod') || this.gl.getExtension('WEBKIT_EXT_shader_texture_lod') || this.gl.getExtension('MOZ_EXT_shader_texture_lod');
    // this.gl.drawBuffersExt = this.gl.getExtension('WEBGL_draw_buffers');

    this.ssao = new d3.SSAO();

    // set picker color attachment
    this.pickerColorTexture = new d3.Texture();
    this.pickerColorTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA, this.gl.RGBA);

    // set picker depth attachment 
    this.pickerDepthRenderbuffer = new d3.Renderbuffer();
    this.pickerDepthRenderbuffer.init(this.gl, this.gl.DEPTH_COMPONENT16);

    // set picker framebuffer
    this.pickerFramebuffer = new d3.Framebuffer();
    this.pickerFramebuffer.init(this.gl);
    this.pickerFramebuffer.setColorTexture(this.gl, this.pickerColorTexture.texture);
    this.pickerFramebuffer.setDepthRenderbuffer(this.gl, this.pickerDepthRenderbuffer.renderbuffer);

    // depth map for shadowing
    this.lightDepthMapTexture = new d3.Texture();
    this.lightDepthMapRenderbuffer = new d3.Renderbuffer();
    this.lightDepthMapFramebuffer = new d3.Framebuffer();
    this.lightDepthMapFramebuffer.init(this.gl);
    
    if(this.gl.depthTextureExt) {
      this.lightDepthMapTexture.init(this.gl, this.gl.UNSIGNED_SHORT, this.gl.DEPTH_COMPONENT);
      this.lightDepthMapRenderbuffer.init(this.gl, this.gl.RGBA4);
      this.lightDepthMapFramebuffer.setColorRenderbuffer(this.gl, this.lightDepthMapRenderbuffer.renderbuffer);
      this.lightDepthMapFramebuffer.setDepthTexture(this.gl, this.lightDepthMapTexture.texture);
    } else {
      this.lightDepthMapTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA, this.gl.RGBA);
      this.lightDepthMapRenderbuffer.init(this.gl, this.gl.DEPTH_COMPONENT16);
      this.lightDepthMapFramebuffer.setColorTexture(this.gl, this.lightDepthMapTexture.texture);
      this.lightDepthMapFramebuffer.setDepthRenderbuffer(this.gl, this.lightDepthMapRenderbuffer.renderbuffer);
    }

    // deferred shading textures, renderbuffers, framebuffers and shaders
    if(this.isSupportDeferred()) {
      // g-buffer
      this.depthTexture = new d3.Texture();
      this.depthTexture.init(this.gl, this.gl.UNSIGNED_SHORT, this.gl.DEPTH_COMPONENT);

      this.colorTexture = new d3.Texture();
      this.colorTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA);

      this.positionTexture = new d3.Texture();
      this.positionTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

      this.normalTexture = new d3.Texture();
      this.normalTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

      // postprocesing effect
      // ssao
      this.ssaoTexture = new d3.Texture();
      this.ssaoTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

      // outline
      this.outlineTexture = new d3.Texture();
      this.outlineTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA);

      this.fxaaTexture = new d3.Texture();
      this.fxaaTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

      // temp texture
      this.imageTexture = new d3.Texture();
      this.imageTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

      // framebuffer
      this.colorFramebuffer = new d3.Framebuffer();
      this.colorFramebuffer.init(this.gl);
      this.colorFramebuffer.setColorTexture(this.gl, this.colorTexture.texture);
      this.colorFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

      this.normalFramebuffer = new d3.Framebuffer();
      this.normalFramebuffer.init(this.gl);
      this.normalFramebuffer.setColorTexture(this.gl, this.normalTexture.texture);
      this.normalFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

      this.positionFramebuffer = new d3.Framebuffer();
      this.positionFramebuffer.init(this.gl);
      this.positionFramebuffer.setColorTexture(this.gl, this.positionTexture.texture);
      this.positionFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

      this.ssaoFramebuffer = new d3.Framebuffer();
      this.ssaoFramebuffer.init(this.gl);
      this.ssaoFramebuffer.setColorTexture(this.gl, this.ssaoTexture.texture);

      this.outlineFramebuffer = new d3.Framebuffer();
      this.outlineFramebuffer.init(this.gl);
      this.outlineFramebuffer.setColorTexture(this.gl, this.outlineTexture.texture);

      this.fxaaFramebuffer = new d3.Framebuffer();
      this.fxaaFramebuffer.init(this.gl);
      this.fxaaFramebuffer.setColorTexture(this.gl, this.fxaaTexture.texture);

      this.quadFramebuffer = new d3.Framebuffer();
      this.quadFramebuffer.init(this.gl);
      this.quadFramebuffer.setColorTexture(this.gl, this.imageTexture.texture);

      this.finalFramebuffer = new d3.Framebuffer();
      this.finalFramebuffer.init(this.gl);
      this.finalFramebuffer.setColorTexture(this.gl, this.fxaaTexture.texture);
      this.finalFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

      this.normalShader = new d3.NormalShader();
      this.normalShader.init(this.gl);

      this.positionShader = new d3.PositionShader();
      this.positionShader.init(this.gl);

      if(d3.SSAOShader){
        this.ssaoShader = new d3.SSAOShader();
        this.ssaoShader.init(this.gl);

        this.ssaoBlurShader = new d3.SSAOBlurShader();
        this.ssaoBlurShader.init(this.gl);
      }

      this.outlineShader = new d3.OutlineShader();
      this.outlineShader.init(this.gl);

      this.lightingShader = new d3.LightingShader();
      this.lightingShader.init(this.gl);

      this.fxaaShader = new d3.FXAAShader();
      this.fxaaShader.init(this.gl);

      this.quadShader = new d3.QuadShader();
      this.quadShader.init(this.gl);
    }

    // this is the shaders
    this.labelShader = new d3.LabelShader();
    this.labelShader.init(this.gl);

    this.pickShader = new d3.PickShader();
    this.pickShader.init(this.gl);

    this.phongShader = new d3.PhongShader();
    this.phongShader.init(this.gl);

    if(d3.DepthShader){
      this.depthShader = new d3.DepthShader();
      this.depthShader.init(this.gl);
    }

    this.textTextImage = new d3.TextImage();
    this.textTextImage.init(this.gl);

    this.gl.textImage = new d3.TextImage();
    this.gl.textImage.init(this.gl);

    this.gl.textMesh = new d3.TextMesh();
    this.gl.textMesh.init(this.gl);

    // set up material
    this.gl.material = new d3.Material();

    this.setupScene();
  } else {
    this.displayMessage();
  }
};
_.displayMessage = function() {
  var canvas = document.getElementById(this.id);
  if (canvas.getContext) {
    var ctx = canvas.getContext('2d');
    if (this.specs.backgroundColor) {
      ctx.fillStyle = this.specs.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.emptyMessage) {
      ctx.fillStyle = '#737683';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
      ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
    }
  }
};
_.renderText = function(text, position) {
  var vertexData = {
    position : [],
    texCoord : [],
    translation : []
  };
  this.textTextImage.pushVertexData(text, position, 0, vertexData);
  this.gl.textMesh.storeData(this.gl, vertexData.position, vertexData.texCoord, vertexData.translation);
  
  this.textTextImage.useTexture(this.gl);
  this.gl.textMesh.render(this.gl);
};
_.setupScene = function() {
  if (this.gl) {
    // clear the canvas
    // set background color for IE's sake, seems like an IE bug where half the repaints don't render a background
    var jqCapsule = q('#' + this.id);
    jqCapsule.css('background-color', this.specs.backgroundColor);
    var cs = math.getRGB(this.specs.backgroundColor, 1);
    this.gl.clearColor(cs[0], cs[1], cs[2], 1.0);
    this.specs.cullBackFace_3D ? this.gl.enable(this.gl.CULL_FACE) : this.gl.disable(this.gl.CULL_FACE);
    // here is the sphere buffer to be drawn, make it once, then scale
    // and translate to draw atoms
    this.gl.sphereBuffer = new d3.Sphere(1, this.specs.atoms_resolution_3D, this.specs.atoms_resolution_3D);
    this.gl.starBuffer = new d3.Star();
    this.gl.cylinderBuffer = new d3.Cylinder(1, 1, this.specs.bonds_resolution_3D);
    this.gl.cylinderClosedBuffer = new d3.Cylinder(1, 1, this.specs.bonds_resolution_3D, true);
    this.gl.boxBuffer = new d3.Box(1, 1, 1);
    this.gl.pillBuffer = new d3.Pill(this.specs.bonds_pillDiameter_3D / 2, this.specs.bonds_pillHeight_3D, this.specs.bonds_pillLatitudeResolution_3D, this.specs.bonds_pillLongitudeResolution_3D);
    this.gl.lineBuffer = new d3.Line();
    this.gl.lineArrowBuffer = new d3.LineArrow();
    this.gl.arrowBuffer = new d3.Arrow(0.3, this.specs.compass_resolution_3D);
    this.gl.quadBuffer = new d3.Quad();
    // texture for rendering text
    this.gl.textImage.updateFont(this.gl, this.specs.text_font_size, this.specs.text_font_families, this.specs.text_font_bold, this.specs.text_font_italic, this.specs.text_font_stroke_3D);
    // set up lighting
    this.lighting.lightScene(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
    // set up fogging
    this.fogging.fogScene(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
    // set up compass
    this.compass = new d3.Compass(this.gl, this.specs);

    // set texture and renderbuffer parameter
    this.lightDepthMapTexture.setParameter(this.gl, this.shadowTextureSize, this.shadowTextureSize);
    this.lightDepthMapRenderbuffer.setParameter(this.gl, this.shadowTextureSize, this.shadowTextureSize);

    this.pickerColorTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.pickerDepthRenderbuffer.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    
    if(this.isSupportDeferred()) {
      this.depthTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.colorTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.imageTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.positionTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.normalTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.ssaoTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.outlineTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      this.fxaaTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

      // set SSAO parameter
      this.ssao.initSampleKernel(this.specs.ssao_kernel_samples);

      this.ssao.initNoiseTexture(this.gl);
    }

    this.camera.updateProjectionMatrix(this.specs.projectionPerspective_3D);

    for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
      var mol = this.molecules[k];
      if (!(mol.labelMesh instanceof d3.TextMesh)) {
        mol.labelMesh = new d3.TextMesh();
        mol.labelMesh.init(this.gl);
      }
      if (mol.chains) {
        mol.ribbons = [];
        mol.cartoons = [];
        mol.tubes = [];
        mol.pipePlanks = [];
        // set up ribbon diagram if available and not already setup
        for ( var j = 0, jj = mol.chains.length; j < jj; j++) {
          var rs = mol.chains[j];
          for ( var i = 0, ii = rs.length - 1; i < ii; i++) {
            rs[i].Test =i;
          }
          var isNucleotide = rs.length > 3 && RESIDUE[rs[3].name] && RESIDUE[rs[3].name].aminoColor === '#BEA06E';
          if (rs.length > 0 && !rs[0].lineSegments) {
            for ( var i = 0, ii = rs.length - 1; i < ii; i++) {
              rs[i].setup(rs[i + 1].cp1, isNucleotide ? 1 : this.specs.proteins_horizontalResolution);
            }
            if (!isNucleotide) {
              for ( var i = 1, ii = rs.length - 1; i < ii; i++) {
                // reverse guide points if carbonyl
                // orientation flips
                if (extensions.vec3AngleFrom(rs[i - 1].D, rs[i].D) > m.PI / 2) {
                  rs[i].guidePointsSmall.reverse();
                  rs[i].guidePointsLarge.reverse();
                  v3.scale(rs[i].D, -1);
                }
              }
            }
            for ( var i = 2, ii = rs.length - 3; i < ii; i++) {
              // compute line segments
              rs[i].computeLineSegments(rs[i - 2], rs[i - 1], rs[i + 1], !isNucleotide, isNucleotide ? this.specs.nucleics_verticalResolution : this.specs.proteins_verticalResolution);
            }
            // remove unneeded dummies
            rs.pop();
            rs.pop();
            rs.pop();
            rs.shift();
            rs.shift();
          }
          // create the hsl color for the chain
          var rgb = math.hsl2rgb(jj === 1 ? .5 : j / jj, 1, .5);
          var chainColor = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
          rs.chainColor = chainColor;
          if (isNucleotide) {
            var t = new d3.Tube(rs, this.specs.nucleics_tubeThickness, this.specs.nucleics_tubeResolution_3D);
            t.chainColor = chainColor;
            mol.tubes.push(t);
          } else {
            var t = new d3.PipePlank(rs, this.specs);
            mol.pipePlanks.push(t);
            var res = rs.shift();
            var r = {
              front : new d3.Ribbon(rs, this.specs.proteins_ribbonThickness, false),
              back : new d3.Ribbon(rs, -this.specs.proteins_ribbonThickness, false)
            };
            r.front.chainColor = chainColor;
            r.back.chainColor = chainColor;
            mol.ribbons.push(r);
            var d = {
              front : new d3.Ribbon(rs, this.specs.proteins_ribbonThickness, true),
              back : new d3.Ribbon(rs, -this.specs.proteins_ribbonThickness, true)
            };
            d.front.chainColor = chainColor;
            d.back.chainColor = chainColor;
            mol.cartoons.push(d);
            rs.unshift(res);
          }
        }
      }
    }
    this.label3D.updateVerticesBuffer(this.gl, this.getMolecules(), this.specs);
    // the molecules in frame of MovieCanvas3D must be handled
    if (this instanceof MovieCanvas3D && this.frames) {
      for ( var i = 0, ii = this.frames.length; i < ii; i++) {
        var f = this.frames[i];
        for ( var j = 0, jj = f.mols.length; j < jj; j++) {
          var mol = f.mols[j];
          if (!(mol.labelMesh instanceof d3.TextMesh)) {
            mol.labelMesh = new d3.TextMesh();
            mol.labelMesh.init(this.gl);
          }
        }
        this.label3D.updateVerticesBuffer(this.gl, f.mols, this.specs);
      }
    }
  }
};
_.updateScene = function() {
  this.camera.updateProjectionMatrix(this.specs.projectionPerspective_3D);

  this.lighting.lightScene(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
  
  this.fogging.fogScene(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
  
  this.repaint();
};
_.mousedown = function(e) {
  this.lastPoint = e.p;
};
_.mouseup = function(e) {
  this.lastPoint = undefined;
};
_.rightmousedown = function(e) {
  this.lastPoint = e.p;
};
_.drag = function(e) {
  if(this.lastPoint){
    if (monitor.ALT) {
      var t = new Point(e.p.x, e.p.y);
      t.sub(this.lastPoint);
      var theta = this.camera.fieldOfView / 360 * m.PI;
      var tanTheta = m.tan(theta);
      var topScreen = this.height / 2 / this.camera.zoom;
      var nearScreen = topScreen / tanTheta;
      var nearRatio = this.camera.focalLength() / nearScreen;
      m4.translate(this.camera.viewMatrix, [ t.x * nearRatio, -t.y * nearRatio, 0 ]);
    } else {
      var difx = e.p.x - this.lastPoint.x;
      var dify = e.p.y - this.lastPoint.y;
      var rotation = m4.rotate(m4.identity([]), difx * m.PI / 180.0, [ 0, 1, 0 ]);
      m4.rotate(rotation, dify * m.PI / 180.0, [ 1, 0, 0 ]);
      this.rotationMatrix = m4.multiply(rotation, this.rotationMatrix);
    }
    this.lastPoint = e.p;
    this.repaint();
  }
};
_.mousewheel = function(e, delta) {
    delta > 0 ? this.camera.zoomIn() : this.camera.zoomOut();
  this.updateScene();
};
_.multitouchmove = function(e, numFingers) {
  if (numFingers === 2) {
    if (this.lastPoint && this.lastPoint.multi) {
      var t = new Point(e.p.x, e.p.y);
      t.sub(this.lastPoint);
      var theta = this.camera.fieldOfView / 360 * m.PI;
      var tanTheta = m.tan(theta);
      var topScreen = this.height / 2 / this.camera.zoom;
      var nearScreen = topScreen / tanTheta;
      var nearRatio = this.camera.focalLength() / nearScreen;
      m4.translate(this.camera.viewMatrix, [ t.x * nearRatio, -t.y * nearRatio, 0 ]);
      this.lastPoint = e.p;
      this.repaint();
    } else {
      this.lastPoint = e.p;
      this.lastPoint.multi = true;
    }
  }
};
_.gesturechange = function(e) {
  if (e.originalEvent.scale - this.lastPinchScale !== 0) {
    var minFov = 0.1;
    var maxFov = 179.9;
    var dz = -(e.originalEvent.scale / this.lastPinchScale - 1) * 30;
    if(isNaN(dz)){
      // this seems to happen on Android when using multiple fingers
      return;
    }
      dz > 0 ? this.camera.zoomIn() : this.camera.zoomOut();
    this.updateScene();
    this.lastPinchScale = e.originalEvent.scale;
  }
  this.repaint();
};
_.gestureend = function(e) {
  this.lastPinchScale = 1;
  this.lastGestureRotate = 0;
};

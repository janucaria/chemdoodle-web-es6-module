import { jQuery as q } from './lib';

let featureDetection = {};

export default featureDetection;

var features = featureDetection;

features.supports_canvas = function() {
  return !!document.createElement('canvas').getContext;
};

features.supports_canvas_text = function() {
  if (!features.supports_canvas()) {
    return false;
  }
  var dummy_canvas = document.createElement('canvas');
  var context = dummy_canvas.getContext('2d');
  return typeof context.fillText === 'function';
};

features.supports_webgl = function() {
  var dummy_canvas = document.createElement('canvas');
  try {
    if (dummy_canvas.getContext('webgl')) {
      return true;
    }
    if (dummy_canvas.getContext('experimental-webgl')) {
      return true;
    }
  } catch (b) {
  }
  return false;
};

features.supports_xhr2 = function() {
  return q.support.cors;
};

features.supports_touch = function() {
  // check the mobile os so we don't interfere with hybrid pcs
  return 'ontouchstart' in window && !!navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|BB10/i);
};

features.supports_gesture = function() {
  return 'ongesturestart' in window;
};

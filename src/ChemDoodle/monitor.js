import featureDetection from './featureDetection';
import { jQuery as q } from './lib';

var m = {};

m.CANVAS_DRAGGING = undefined;
m.CANVAS_OVER = undefined;
m.ALT = false;
m.SHIFT = false;
m.META = false;

if (!featureDetection.supports_touch()) {
  q(document).ready(function() {
    // handles dragging beyond the canvas bounds
    q(document).mousemove(function(e) {
      if (m.CANVAS_DRAGGING) {
        if (m.CANVAS_DRAGGING.drag) {
          m.CANVAS_DRAGGING.prehandleEvent(e);
          m.CANVAS_DRAGGING.drag(e);
        }
      }
    });
    q(document).mouseup(function(e) {
      if (m.CANVAS_DRAGGING && m.CANVAS_DRAGGING !== m.CANVAS_OVER) {
        if (m.CANVAS_DRAGGING.mouseup) {
          m.CANVAS_DRAGGING.prehandleEvent(e);
          m.CANVAS_DRAGGING.mouseup(e);
        }
      }
      m.CANVAS_DRAGGING = undefined;
    });
    // handles modifier keys from a single keyboard
    q(document).keydown(function(e) {
      m.SHIFT = e.shiftKey;
      m.ALT = e.altKey;
      m.META = e.metaKey || e.ctrlKey;
      var affecting = m.CANVAS_OVER;
      if (m.CANVAS_DRAGGING) {
        affecting = m.CANVAS_DRAGGING;
      }
      if (affecting) {
        if (affecting.keydown) {
          affecting.prehandleEvent(e);
          affecting.keydown(e);
        }
      }
    });
    q(document).keypress(function(e) {
      var affecting = m.CANVAS_OVER;
      if (m.CANVAS_DRAGGING) {
        affecting = m.CANVAS_DRAGGING;
      }
      if (affecting) {
        if (affecting.keypress) {
          affecting.prehandleEvent(e);
          affecting.keypress(e);
        }
      }
    });
    q(document).keyup(function(e) {
      m.SHIFT = e.shiftKey;
      m.ALT = e.altKey;
      m.META = e.metaKey || e.ctrlKey;
      var affecting = m.CANVAS_OVER;
      if (m.CANVAS_DRAGGING) {
        affecting = m.CANVAS_DRAGGING;
      }
      if (affecting) {
        if (affecting.keyup) {
          affecting.prehandleEvent(e);
          affecting.keyup(e);
        }
      }
    });
  });
}

const monitor = m;
export default monitor;

import _Canvas from './_Canvas';

export default function FileCanvas(id, width, height, action) {
  if (id) {
    this.create(id, width, height);
  }
  var form = '<br><form name="FileForm" enctype="multipart/form-data" method="POST" action="' + action + '" target="HiddenFileFrame"><input type="file" name="f" /><input type="submit" name="submitbutton" value="Show File" /></form><iframe id="HFF-' + id + '" name="HiddenFileFrame" height="0" width="0" style="display:none;" onLoad="GetMolFromFrame(\'HFF-' + id + '\', ' + id + ')"></iframe>';
  document.writeln(form);
  this.emptyMessage = 'Click below to load file';
  this.repaint();
};
FileCanvas.prototype = new _Canvas();
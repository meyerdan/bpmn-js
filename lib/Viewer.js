'use strict';

var Diagram = require('diagram-js'),
    BpmnModel = require('bpmn-moddle'),
    $ = require('jquery'),
    _ = require('lodash');

var Importer = require('./import/Importer'),
    util = require('./Util');


function getSvgContents(diagram) {
  var outerNode = diagram.get('canvas').getContainer();

  var svg = outerNode.innerHTML;
  return svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')
            .replace('<desc>Created with Snap</desc>', '')
            .replace(/<g class="viewport"( transform="[^"]*")?/, '<g');
}

function initListeners(diagram, listeners) {
  var events = diagram.get('eventBus');

  listeners.forEach(function(l) {
    events.on(l.event, l.handler);
  });
}

function checkValidationError(err) {

  // check if we can help the user by indicating wrong BPMN 2.0 xml
  // (in case he or the exporting tool did not get that right)

  var pattern = /unparsable content <([^>]+)> detected([\s\S]*)$/;
  var match = pattern.exec(err.message);

  if (match) {
    err.message =
      'unparsable content <' + match[1] + '> detected; ' +
      'this may indicate an invalid BPMN 2.0 diagram file' + match[2];
  }

  return err;
}

/**
 * @class
 *
 * A viewer for BPMN 2.0 diagrams
 *
 * @param {Object} [options] configuration options to pass to the viewer
 * @param {DOMElement} [options.container] the container to render the viewer in, defaults to body.
 * @param {String|Number} [options.width] the width of the viewer
 * @param {String|Number} [options.height] the height of the viewer
 */
function Viewer(options) {
  this.options = options = options || {};

  var parent = options.container || $('body');

  var container = $('<div></div>').addClass('bjs-container').css({
    position: 'relative'
  }).appendTo(parent);

  _.forEach([ 'width', 'height' ], function(a) {
    if (options[a]) {
      container.css(a, options[a]);
    }
  });

  // unwrap jquery
  this.container = container.get(0);

  /**
   * The code in the <project-logo></project-logo> area
   * must not be changed, see http://bpmn.io/license for more information
   *
   * <project-logo>
   */

  /* jshint -W101 */

  // inlined ../resources/bpmnjs.png
  var logoData = 'iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAMAAADypuvZAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFiMte9PrwldFwfcZPqtqN0+zEyOe1XLgjvuKncsJAZ70y6fXh3vDT////UrQV////G2zN+AAAABB0Uk5T////////////////////AOAjXRkAAAHDSURBVHjavJZJkoUgDEBJmAX8979tM8u3E6x20VlYJfFFMoL4vBDxATxZcakIOJTWSmxvKWVIkJ8jHvlRv1F2LFrVISCZI+tCtQx+XfewgVTfyY3plPiQEAzI3zWy+kR6NBhFBYeBuscJLOUuA2WVLpCjVIaFzrNQZArxAZKUQm6gsj37L9Cb7dnIBUKxENaaMJQqMpDXvSL+ktxdGRm2IsKgJGGPg7atwUG5CcFUEuSv+CwQqizTrvDTNXdMU2bMiDWZd8d7QIySWVRsb2vBBioxOFt4OinPBapL+neAb5KL5IJ8szOza2/DYoipUCx+CjO0Bpsv0V6mktNZ+k8rlABlWG0FrOpKYVo8DT3dBeLEjUBAj7moDogVii7nSS9QzZnFcOVBp1g2PyBQ3Vr5aIapN91VJy33HTJLC1iX2FY6F8gRdaAeIEfVONgtFCzZTmoLEdOjBDfsIOA6128gw3eu1shAajdZNAORxuQDJN5A5PbEG6gNIu24QJD5iNyRMZIr6bsHbCtCU/OaOaSvgkUyDMdDa1BXGf5HJ1To+/Ym6mCKT02Y+/Sa126ZKyd3jxhzpc1r8zVL6YM1Qy/kR4ABAFJ6iQUnivhAAAAAAElFTkSuQmCC';

  /* jshint +W101 */

  var a = $('<a href="http://bpmn.io" target="_blank" class="bjs-powered-by" title="Powered by bpmn.io" />').css({
    position: 'absolute',
    bottom: 15,
    right: 15,
    zIndex: 100
  });

  var logo = $('<img/>').attr('src', 'data:image/png;base64,' + logoData).appendTo(a);

  a.appendTo(container);

  /* </project-logo> */
}

Viewer.prototype.importXML = function(xml, done) {

  var self = this;

  BpmnModel.fromXML(xml, 'bpmn:Definitions', function(err, definitions) {

    if (err) {
      err = checkValidationError(err);
      return done(err);
    }

    self.importDefinitions(definitions, done);
  });
};

Viewer.prototype.saveXML = function(options, done) {

  if (!done) {
    done = options;
    options = {};
  }

  var definitions = this.definitions;

  if (!definitions) {
    return done(new Error('no definitions loaded'));
  }

  BpmnModel.toXML(definitions, options, function(err, xml) {
    done(err, xml);
  });
};


var SVG_HEADER =
'<?xml version="1.0" encoding="utf-8"?>\n' +
'<!-- created with bpmn-js / http://bpmn.io -->\n' +
'<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">\n';

var SVG_FOOTER = '</svg>';

Viewer.prototype.saveSVG = function(options, done) {
  if (!done) {
    done = options;
    options = {};
  }

  if (!this.definitions) {
    return done(new Error('no definitions loaded'));
  }

  var svgContents = getSvgContents(this.diagram);

  var svg = SVG_HEADER + svgContents + SVG_FOOTER;

  done(null, svg);
};

Viewer.prototype.get = function(name) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.get(name);
};

Viewer.prototype.invoke = function(fn) {

  if (!this.diagram) {
    throw new Error('no diagram loaded');
  }

  return this.diagram.invoke(fn);
};

Viewer.prototype.importDefinitions = util.failSafeAsync(function(definitions, done) {

  var diagram = this.diagram;

  if (diagram) {
    this.clear();
  }

  this.diagram = diagram = this._createDiagram(this.options.modules);
  this.definitions = definitions;

  this._init(diagram);

  Importer.importBpmnDiagram(diagram, definitions, done);
});

Viewer.prototype._init = function(diagram) {
  initListeners(diagram, this.__listeners || []);
};

Viewer.prototype._createDiagram = function(modules) {

  modules = [].concat(modules || this.getModules());

  // add self as an available service
  modules.unshift({
    bpmnjs: [ 'value', this ]
  });

  return new Diagram({
    canvas: { container: this.container },
    modules: modules
  });
};


Viewer.prototype.getModules = function() {
  return this._modules;
};

/**
 * Remove all drawn elements from the viewer
 */
Viewer.prototype.clear = function() {
  var diagram = this.diagram;

  if (diagram) {
    diagram.destroy();
  }
};

/**
 * Register an event listener on the viewer
 *
 * @param {String} event
 * @param {Function} handler
 */
Viewer.prototype.on = function(event, handler) {
  var diagram = this.diagram,
      listeners = this.__listeners = this.__listeners || [];

  listeners = this.__listeners || [];
  listeners.push({ event: event, handler: handler });

  if (diagram) {
    diagram.get('eventBus').on(event, handler);
  }
};

// modules the viewer is composed of
Viewer.prototype._modules = [
  require('./core'),
  require('./draw'),
  require('diagram-js/lib/features/selection')
];

module.exports = Viewer;

'use strict';

var Diagram = require('diagram-js');

var Viewer = require('./Viewer');

var initialDiagram =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
                    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
                    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
                    'targetNamespace="http://bpmn.io/schema/bpmn" ' +
                    'id="Definitions_1">' +
    '<bpmn:process id="Process_1" isExecutable="false">' +
      '<bpmn:startEvent id="StartEvent_1"/>' +
    '</bpmn:process>' +
    '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
      '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">' +
        '<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">' +
          '<dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>' +
        '</bpmndi:BPMNShape>' +
      '</bpmndi:BPMNPlane>' +
    '</bpmndi:BPMNDiagram>' +
  '</bpmn:definitions>';

/**
 * @class
 *
 * A modeler for BPMN 2.0 diagrams.
 *
 * @borrows Viewer as Modeler
 */
function Modeler(options) {
  Viewer.call(this, options);
}

Modeler.prototype = Object.create(Viewer.prototype);

Modeler.prototype.createDiagram = function(done) {
  return this.importXML(initialDiagram, done);
};


// modules the modeler is composed of
Modeler.prototype._modules = Modeler.prototype._modules.concat([
  // TODO (nre): buggy in conjunction with zoomscroll / move canvas
  // require('diagram-js/lib/features/move'),
  require('./features/label-editing'),
  require('./features/zoomscroll'),
  require('./features/touch'),
  require('./features/movecanvas'),
  require('./features/context-pad')
]);


module.exports = Modeler;

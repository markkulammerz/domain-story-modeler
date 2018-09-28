'use strict';

import $ from 'jquery';

import DomainStoryModeler from './domain-story-modeler';

import {
  setStash,
  setLabelStash,
  getWorkobjectDictionary
} from './domain-story-modeler/domain-story/label-editing/DSLabelEditingProvider';

import {
  traceActivities,
  isStoryConsecutivelyNumbered,
  getAllNonShown,
  getAllShown
} from './domain-story-modeler/domain-story/replay/ReplayUtil';

import {
  getActivitesFromActors,
  updateExistingNumbersAtEditing
} from './domain-story-modeler/domain-story/util/DSActivityUtil';

import { version } from '../package.json';

import DomainStoryActivityHandlers from './domain-story-modeler/domain-story/handlers/DomainStoryActivityHandlers';

import DomainStoryLabelChangeHandlers from './domain-story-modeler/domain-story/handlers/DomainStoryLabelChangeHandlers';

import {
  checkInput,
  keyReleased,
  getAllObjectsFromCanvas,
  debounce,
  openDictionary
} from './domain-story-modeler/domain-story/util/AppUtil';

import {
  getActivityDictionary,
  setActivityLabelStash,
  cleanActicityLabelStash,
  autocomplete
} from './domain-story-modeler/domain-story/util/DSUtil';

import sanitize from './domain-story-modeler/domain-story/util/Sanitizer';

import SearchPad from '../node_modules/diagram-js/lib/features/search-pad/SearchPad';

var modeler = new DomainStoryModeler({
  container: '#canvas',
  keyboard: {
    bindTo: document
  }
});

var canvas = modeler.get('canvas');
var eventBus = modeler.get('eventBus');
var commandStack = modeler.get('commandStack');
var elementRegistry = modeler.get('elementRegistry');

// we need to initiate the activity commandStack elements
DomainStoryActivityHandlers(commandStack, eventBus, canvas);
DomainStoryLabelChangeHandlers(commandStack, eventBus, canvas);

modeler.createDiagram();
// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;

// HTML-Elements
var lastInputTitle = '',
    lastInputDescription = '',
    headline = document.getElementById('headline'),
    title = document.getElementById('title'),
    dialog = document.getElementById('dialog'),
    saveButton = document.getElementById('saveButton'),
    quitButton = document.getElementById('quitButton'),
    titleInput = document.getElementById('titleInput'),
    exportButton = document.getElementById('export'),
    importExportSVGDiv = document.getElementById('importExportSVGButton'),
    replayStepLabel = document.getElementById('replayStep'),
    modal = document.getElementById('modal'),
    arrow = document.getElementById('arrow'),
    info = document.getElementById('info'),
    infoText = document.getElementById('infoText'),
    inputNumber = document.getElementById('inputNumber'),
    inputLabel = document.getElementById('inputLabel'),
    numberDialog = document.getElementById('numberDialog'),
    labelDialog = document.getElementById('labelDialog'),
    startReplayButton = document.getElementById('buttonStartReplay'),
    nextStepButton = document.getElementById('buttonNextStep'),
    previousStepbutton = document.getElementById('buttonPreviousStep'),
    stopReplayButton = document.getElementById('buttonStopReplay'),
    dictionaryButton = document.getElementById('dictionaryButton'),
    dictionaryDialog = document.getElementById('dictionary'),
    activityDictionaryHTML = document.getElementById('activityDictionaryContainer'),
    workobjectDictionaryHTML = document.getElementById('workobjectDictionaryContainer'),
    closeDictionaryButtonSave = document.getElementById('closeDictionaryButtonSave'),
    closeDictionaryButtonCancel = document.getElementById('closeDictionaryButtonCancel'),
    numberSaveButton = document.getElementById('numberSaveButton'),
    numberQuitButton = document.getElementById('numberQuitButton'),
    labelInputLabel = document.getElementById('labelInputLabel'),
    labelSaveButton = document.getElementById('labelSaveButton'),
    labelQuitButton = document.getElementById('labelQuitButton'),
    svgSaveButton = document.getElementById('buttonSVG'),
    wpsLogo = document.getElementById('imgWPS'),
    dstLogo = document.getElementById('imgDST'),
    wpsLogoInfo = document.getElementById('wpsLogoInfo'),
    dstLogoInfo = document.getElementById('dstLogoInfo'),
    wpsButton = document.getElementById('closeWPSLogoInfo'),
    dstButton = document.getElementById('closeDSTLogoInfo'),
    wpsInfotext = document.getElementById('wpsLogoInnerText'),
    wpsInfotext2 = document.getElementById('wpsLogoInnerText2'),
    dstInfotext = document.getElementById('dstLogoInnerText'),
    incompleteStoryInfo = document.getElementById('incompleteStoryInfo'),
    closeIncompleteStoryInfoButton = document.getElementById('closeIncompleteStoryInfo'),
    versionDialog = document.getElementById('versionDialog'),
    closeVersionDialogButton = document.getElementById('closeVersionDialog'),
    importedVersionLabel = document.getElementById('importedVersion'),
    modelerVersionLabel = document.getElementById('modelerVersion');

// interal variables
var keysPressed = [];
var svgData;
var replayOn = false;
var currentStep = 0;
var replaySteps = [];

// eventBus listeners

eventBus.on('element.dblclick', function(e) {
  if (!replayOn) {
    var element = e.element;
    if (element.type == 'domainStory:activity') {
      var source=element.source;

      var dict = getActivityDictionary();
      autocomplete(inputLabel, dict, element);
      autocomplete(labelInputLabel, dict, element);

      setStash(false);

      if (source.type.includes('domainStory:actor')) {
        showNumberDialog(element);
        document.getElementById('inputLabel').focus();
      }
      else if (source.type.includes('domainStory:workObject')) {
        showLabelDialog(element);
        document.getElementById('labelInputLabel').focus();
      }

      // onclick and key functions, that need the element to which the event belongs
      labelSaveButton.onclick = function() {
        saveLabelDialog(element);
      };

      numberSaveButton.onclick = function() {
        saveNumberDialog(element);
      };

      labelInputLabel.onkeydown = function(e) {
        checkInput(labelInputLabel);
        checkPressedKeys(e.keyCode, 'labelDialog', element);
      };

      inputNumber.onkeydown = function(e) {
        checkInput(inputNumber);
        checkPressedKeys(e.keyCode, 'numberDialog', element);
      };

      inputLabel.onkeydown = function(e) {
        checkInput(inputLabel);
        checkPressedKeys(e.keyCode, 'numberDialog', element);
      };
    }
  }
});

// when in replay, do not allow any interaction on the canvas
eventBus.on([
  'element.click',
  'element.dblclick',
  'element.mousedown',
  'drag.init',
  'canvas.viewbox.changing',
  'autoPlace',
  'popupMenu.open'
], 10000000000, function(event) {
  if (replayOn) {
    event.stopPropagation();
    event.preventDefault();
  }
});

// ----

wpsInfotext.innerText = 'Domain Story Modeler v' + version + '\nA tool to visualize Domain Stories in the browser.\nProvided by';
wpsInfotext2.innerText = ' and licensed under GPLv3.';
dstInfotext.innerText = 'Learn more about Domain Storytelling at';

// HTML-Element event listeners

headline.addEventListener('click', function() {
  showDialog();
});

dictionaryButton.addEventListener('click', function() {
  openDictionary(canvas);
});

wpsLogo.addEventListener('click', function() {
  modal.style.display = 'block';
  wpsLogoInfo.style.display = 'block';
});

dstLogo.addEventListener('click', function() {
  modal.style.display = 'block';
  dstLogoInfo.style.display = 'block';
});

wpsButton.addEventListener('click', function() {
  wpsLogoInfo.style.display = 'none';
  modal.style.display = 'none';
});

dstButton.addEventListener('click', function() {
  dstLogoInfo.style.display = 'none';
  modal.style.display = 'none';
});

saveButton.addEventListener('click', function() {
  saveDialog();
});

quitButton.addEventListener('click', function() {
  closeDialog();
});

numberQuitButton.addEventListener('click', function() {
  closeNumberDialog();
});

labelQuitButton.addEventListener('click', function() {
  closeLabelDialog();
});

titleInput.addEventListener('keydown', function(e) {
  checkPressedKeys(e.keyCode, 'titleDialog');
  checkInput(titleInput);
});

titleInput.addEventListener('keyup', function(e) {
  checkInput(titleInput);
  keyReleased(keysPressed, e.keyCode);
});

info.addEventListener('keydown', function(e) {
  checkPressedKeys(e.keyCode, 'infoDialog');
  checkInput(info);
});

info.addEventListener('keyup', function(e) {
  checkInput(info);
  keyReleased(keysPressed, e.keyCode);
});

labelInputLabel.addEventListener('keyup', function() {
  checkInput(labelInputLabel);
});

inputLabel.addEventListener('keyup', function(e) {
  keyReleased(keysPressed, e.keyCode);
  checkInput(inputLabel);
});

closeDictionaryButtonSave.addEventListener('click', function(e) {
  var oldActivityLabelStash = getActivityDictionary();
  var oldWorkobjectDictionary = getWorkobjectDictionary();

  var activityNewNames = [];
  var workObjectNewNames = [];

  activityDictionaryHTML.childNodes.forEach(child=>{
    if (child.value) {
      activityNewNames[child.id] = child.value;
    }
  });

  workobjectDictionaryHTML.childNodes.forEach(child=>{
    if (child.value) {
      workObjectNewNames[child.id] = child.value;
    }
  });

  if (activityNewNames.length == oldActivityLabelStash.length && workObjectNewNames.length==oldWorkobjectDictionary.length) {
    workDifferences(activityNewNames, oldActivityLabelStash, workObjectNewNames, oldWorkobjectDictionary);
  }

  dictionaryDialog.style.display='none';
  modal.style.display='none';
});

closeDictionaryButtonCancel.addEventListener('click', function(e) {
  dictionaryDialog.style.display='none';
  modal.style.display='none';
});

startReplayButton.addEventListener('click', function() {

  var canvasObjects = canvas._rootElement.children;
  var activities = getActivitesFromActors(canvasObjects);

  if (!replayOn && activities.length > 0) {

    replaySteps = traceActivities(activities, elementRegistry);

    if (isStoryConsecutivelyNumbered(replaySteps)) {
      replayOn = true;
      disableCanvasInteraction();
      currentStep = 0;
      showCurrentStep();
    }
    else {
      incompleteStoryInfo.style.display = 'block';
      modal.style.display = 'block';
    }
  }
});

nextStepButton.addEventListener('click', function() {
  if (replayOn) {
    if (currentStep < replaySteps.length - 1) {
      currentStep += 1;
      showCurrentStep();
    }
  }
});

previousStepbutton.addEventListener('click', function() {
  if (replayOn) {
    if (currentStep > 0) {
      currentStep -= 1;
      showCurrentStep();
    }
  }
});

stopReplayButton.addEventListener('click', function() {
  if (replayOn) {
    enableCanvasInteraction();

    // show all canvas elements
    var allObjects = [];
    var groupObjects = [];
    var canvasObjects = canvas._rootElement.children;
    var i = 0;


    for (i = 0; i < canvasObjects.length; i++) {
      if (canvasObjects[i].type.includes('domainStory:group')) {
        groupObjects.push(canvasObjects[i]);
      }
      else {
        allObjects.push(canvasObjects[i]);
      }
    }

    i = groupObjects.length - 1;
    while (groupObjects.length >= 1) {
      var currentgroup = groupObjects.pop();
      currentgroup.children.forEach(child => {
        if (child.type.includes('domainStory:group')) {
          groupObjects.push(child);
        }
        else {
          allObjects.push(child);
        }
      });
      i = groupObjects.length - 1;
    }
    allObjects.forEach(element => {
      var domObject = document.querySelector('[data-element-id=' + element.id + ']');
      domObject.style.display = 'block';
    });

    replayOn = false;
    currentStep = 0;
  }
});

exportButton.addEventListener('click', function() {

  var object = modeler.getCustomElements();
  var text = info.innerText;
  var newObject = object.slice(0);

  newObject.push({ info: text });
  newObject.push({ version: version });
  var json = JSON.stringify(newObject);
  var filename = title.innerText + '_' + new Date().toISOString().slice(0, 10);

  // start file download
  download(filename, json);
});

svgSaveButton.addEventListener('click', function() {
  var filename = title.innerText + '_' + new Date().toISOString().slice(0, 10);
  downloadSVG(filename);
});

closeIncompleteStoryInfoButton.addEventListener('click', function() {
  modal.style.display = 'none';
  incompleteStoryInfo.style.display = 'none';
});

closeVersionDialogButton.addEventListener('click', function() {
  modal.style.display = 'none';
  versionDialog.style.display = 'none';
});

// -----

document.getElementById('import').onchange = function() {

  var input = document.getElementById('import').files[0];
  var reader = new FileReader();
  if (input.name.endsWith('.dst')) {
    var titleText = input.name.replace(/_\d+-\d+-\d+( ?_?\(\d+\))?.dst/, '');
    titleText = sanitize(titleText);
    titleInput.value = titleText;
    title.innerText = titleText;
    lastInputTitle = titleInput.value;

    reader.onloadend = function(e) {
      var text = e.target.result;

      var elements = JSON.parse(text);
      var lastElement = elements.pop();

      var importVersionNumber = lastElement;
      if (lastElement.version) {
        lastElement = elements.pop();
      }

      if (importVersionNumber.version) {
        importVersionNumber = importVersionNumber.version;
      } else {
        importVersionNumber = '?';
      }

      if (version != importVersionNumber) {
        importedVersionLabel.innerText = 'v' + importVersionNumber;
        modelerVersionLabel.innerText = 'v' + version;
        showVersionDialog();
      }

      var inputInfoText = sanitize(lastElement.info ? lastElement.info : '');
      info.innerText = inputInfoText;
      info.value = inputInfoText;
      lastInputDescription = info.value;
      infoText.innerText = inputInfoText;

      modeler.importCustomElements(elements);
      cleanActicityLabelStash(canvas);
      setLabelStash(canvas);
    };

    reader.readAsText(input);

    // to update the title of the svg, we need to tell the command stack, that a value has changed
    var exportArtifacts = debounce(function() {

      saveSVG(function(err, svg) {
        setEncoded(err ? null : svg);
      });
    }, 500);

    eventBus.fire('commandStack.changed', exportArtifacts);
  }
};

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename + '.dst');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function downloadSVG(filename) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:application/bpmn20-xml;charset=UTF-8,' + svgData);
  element.setAttribute('download', filename + '.svg');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function checkPressedKeys(keyCode, dialog, element) {
  const KEY_ENTER = 13;
  const KEY_SHIFT = 16;
  const KEY_CTRL = 17;
  const KEY_ALT = 18;
  const KEY_ESC = 27;

  keysPressed[keyCode] = true;

  if (keysPressed[KEY_ESC]) {
    closeDialog();
    closeLabelDialog();
    closeNumberDialog();
  }
  else if ((keysPressed[KEY_CTRL] && keysPressed[KEY_ENTER]) || (keysPressed[KEY_ALT] && keysPressed[KEY_ENTER])) {
    if (dialog == 'infoDialog') {
      info.value += '\n';
    }
  }
  else if (keysPressed[KEY_ENTER] && !keysPressed[KEY_SHIFT]) {
    if (dialog == 'titleDialog' || dialog == 'infoDialog') {
      saveDialog();
    }
    else if (dialog == 'labelDialog') {
      saveLabelDialog(element);
    }
    else if (dialog == 'numberDialog') {
      saveNumberDialog(element);
    }
  }
}

// dialog functions

function showVersionDialog() {
  versionDialog.style.display = 'block';
  modal.style.display = 'block';
}

function closeDialog() {
  keysPressed = [];
  dialog.style.display = 'none';
  modal.style.display = 'none';
  arrow.style.display = 'none';
}

function showDialog() {
  info.value = lastInputDescription;
  titleInput.value = lastInputTitle;
  dialog.style.display = 'block';
  modal.style.display = 'block';
  arrow.style.display = 'block';
  titleInput.focus();
}

function saveDialog() {
  var inputTitle = titleInput.value;
  var inputText = info.value;
  if (inputTitle !== '') {
    title.innerText = sanitize(inputTitle);
  }
  else {
    title.innerText = '<name of this Domain Story>';
  }
  inputText = sanitize(inputText);
  info.innerText = inputText;
  infoText.innerText = inputText;

  lastInputTitle = inputTitle;
  lastInputDescription = inputText;

  // to update the title of the svg, we need to tell the command stack, that a value has changed
  var exportArtifacts = debounce(function() {

    saveSVG(function(err, svg) {
      setEncoded(err ? null : svg);
    });
  }, 500);

  eventBus.fire('commandStack.changed', exportArtifacts);

  keysPressed = [];
  closeDialog();
}

function showNumberDialog(event) {
  modal.style.display = 'block';
  numberDialog.style.display = 'block';
  inputLabel.value = '';
  inputNumber.value = '';

  if (event.businessObject.name != null) {
    inputLabel.value = event.businessObject.name;
  }
  if (event.businessObject.number != null) {
    inputNumber.value = event.businessObject.number;
  }
}

function showLabelDialog(event) {
  modal.style.display = 'block';
  labelDialog.style.display = 'block';
  labelInputLabel.value = '';

  if (event.businessObject.name != null) {
    labelInputLabel.value = event.businessObject.name;
  }
}


function closeNumberDialog() {
  inputLabel.value = '';
  inputNumber.value = '';
  keysPressed = [];
  numberDialog.style.display = 'none';
  modal.style.display = 'none';
}


function saveNumberDialog(element) {
  var labelInput = '';
  var numberInput = '';
  var activityLabelStash = getActivityDictionary();
  if (inputLabel != '') {
    labelInput = inputLabel.value;
    if (!activityLabelStash.includes(labelInput)) {
      activityLabelStash.push(labelInput);
    }
  }
  if (inputNumber != '') {
    numberInput = inputNumber.value;
  }
  setActivityLabelStash(activityLabelStash);

  numberDialog.style.display = 'none';
  modal.style.display = 'none';

  inputLabel.value = '';
  inputNumber.value = '';
  keysPressed = [];

  var canvasObjects = canvas._rootElement.children;

  var activitiesFromActors = getActivitesFromActors(canvasObjects);

  var index = activitiesFromActors.indexOf(element);
  activitiesFromActors.splice(index, 1);

  commandStack.execute('activity.changed', {
    businessObject: element.businessObject,
    newLabel: labelInput,
    newNumber: numberInput,
    element: element
  });

  updateExistingNumbersAtEditing(activitiesFromActors, numberInput, eventBus);
  cleanActicityLabelStash(canvas);
}

function closeLabelDialog() {
  labelInputLabel.value = '';
  keysPressed = [];
  labelDialog.style.display = 'none';
  modal.style.display = 'none';
}

function saveLabelDialog(element) {
  var labelInput = '';
  var activityLabelStash=getActivityDictionary();
  if (labelInputLabel != '') {
    labelInput = labelInputLabel.value;
    if (!activityLabelStash.includes(labelInput)) {
      activityLabelStash.push(labelInput);
    }
  }

  setActivityLabelStash(activityLabelStash);

  labelDialog.style.display = 'none';
  modal.style.display = 'none';

  labelInputLabel.value = '';
  keysPressed = [];

  commandStack.execute('activity.changed', {
    businessObject: element.businessObject,
    newLabel: labelInput,
    element: element
  });
  cleanActicityLabelStash(canvas);
}

function workDifferences(activityNames, oldActivityLabelStash, workObjectNames, oldWorkobjectDictionary) {
  var i=0;
  for (i=0;i<oldActivityLabelStash.length;i++) {
    if (!activityNames[i]) {
      activityNames[i]='';
    }
    if (!((activityNames[i].includes(oldActivityLabelStash[i])) && (oldActivityLabelStash[i].includes(activityNames[i])))) {
      changeAllEntries(oldActivityLabelStash[i], activityNames[i], 'domainStory:activity');
    }
  }
  for (i=0;i<oldWorkobjectDictionary.length;i++) {
    if (!workObjectNames[i]) {
      workObjectNames[i]='';
    }
    if (!((workObjectNames[i].includes(oldWorkobjectDictionary[i])) && (oldWorkobjectDictionary[i].includes(workObjectNames[i])))) {
      changeAllEntries(oldWorkobjectDictionary[i], workObjectNames[i], 'domainStory:workObject');
    }
  }
  // delete old entires from stashes
}

function changeAllEntries(oldValue, newValue, type) {
  var allObjects = getAllObjectsFromCanvas(canvas);
  var allRelevantObjects=[];

  allObjects.forEach(element =>{
    if (element.type.includes(type) && element.businessObject.name == oldValue) {
      allRelevantObjects.push(element);
    }
  });

  var context = {
    elements: allRelevantObjects,
    newValue: newValue
  };

  commandStack.execute('domainStoryObjects.massRename', context);
}

// replay functions

function disableCanvasInteraction() {
  var contextPadElements = document.getElementsByClassName('djs-context-pad');
  var paletteElements = document.getElementsByClassName('djs-palette');

  headline.style.pointerEvents = 'none';

  importExportSVGDiv.style.opacity = 0.2;
  importExportSVGDiv.style.pointerEvents = 'none';

  startReplayButton.style.opacity = 0.2;
  startReplayButton.style.pointerEvents = 'none';

  stopReplayButton.style.opacity = 1;
  stopReplayButton.style.pointerEvents = 'all';

  nextStepButton.style.opacity = 1;
  nextStepButton.style.pointerEvents = 'all';

  previousStepbutton.style.opacity = 1;
  previousStepbutton.style.pointerEvents = 'all';

  var i = 0;
  for (i = 0; i < contextPadElements.length; i++) {
    contextPadElements[i].style.display = 'none';
  }

  for (i = 0; i < paletteElements.length; i++) {
    paletteElements[i].style.display = 'none';
  }

  replayStepLabel.style.display = 'block';
}

function enableCanvasInteraction() {
  var contextPadElements = document.getElementsByClassName('djs-context-pad');
  var paletteElements = document.getElementsByClassName('djs-palette');

  headline.style.pointerEvents = 'all';

  importExportSVGDiv.style.opacity = 1;
  importExportSVGDiv.style.pointerEvents = 'all';

  startReplayButton.style.opacity = 1;
  startReplayButton.style.pointerEvents = 'all';

  stopReplayButton.style.opacity = 0.2;
  stopReplayButton.style.pointerEvents = 'none';

  nextStepButton.style.opacity = 0.2;
  nextStepButton.style.pointerEvents = 'none';

  previousStepbutton.style.opacity = 0.2;
  previousStepbutton.style.pointerEvents = 'none';

  var i = 0;
  for (i = 0; i < contextPadElements.length; i++) {
    contextPadElements[i].style.display = 'block';
  }

  for (i = 0; i < paletteElements.length; i++) {
    paletteElements[i].style.display = 'block';
  }
  replayStepLabel.style.display = 'none';
}

function showCurrentStep() {
  var stepsUntilNow = [];
  var allObjects = [];
  var i = 0;

  replayStepLabel.innerText = (currentStep + 1) + ' / ' + replaySteps.length;

  for (i = 0; i <= currentStep; i++) {
    stepsUntilNow.push(replaySteps[i]);
  }

  allObjects = getAllObjectsFromCanvas(canvas);

  var shownElements = getAllShown(stepsUntilNow);

  var notShownElements = getAllNonShown(allObjects, shownElements);

  // hide all elements, that are not to be shown
  notShownElements.forEach(element => {
    var domObject = document.querySelector('[data-element-id=' + element.id + ']');
    domObject.style.display = 'none';
  });

  shownElements.forEach(element => {
    var domObject = document.querySelector('[data-element-id=' + element.id + ']');
    domObject.style.display = 'block';
  });
}

// disable BPMN SearchPad
SearchPad.prototype.toggle=function() { };

// SVG download

function saveSVG(done) {
  modeler.saveSVG(done);
}

function setEncoded(data) {
  var indices = [];

  // in the svg-image, activities are represented as rectangles
  // to represent them as lines, we add a Fill: none characteristic
  // since only activities and annotation-conntections use markers
  // at their end, we check for their mentions to determine the
  // wanted text-position

  if (data.indexOf('marker-end: url(\'')) {
    indices[0] = data.indexOf('marker-end: url(\'');
  }

  var nextIndex = data.indexOf(indices[0], 'marker-end: url(\'');
  while (nextIndex > 0) {
    indices[indices.length] = nextIndex;
    nextIndex = data.indexOf(indices[data.length - 1], 'marker-end: url(\'');
  }

  for (var i = indices.length - 1; i >= 0; i--) {
    data = [data.slice(0, indices[i]), 'fill: none; ', data.slice(indices[i])].join('');
  }

  svgData = encodeURIComponent(data);
}

$(function() {
  var exportArtifacts = debounce(function() {

    saveSVG(function(err, svg) {
      setEncoded(err ? null : svg);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});
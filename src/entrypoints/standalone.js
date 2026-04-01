// Standalone auto-mount entrypoint
var _standaloneTarget = document.getElementById('app');
if (_standaloneTarget) {
  window.JMHZViewerRuntime.mount(_standaloneTarget, { manageDocumentTitle: true, warnBeforeUnload: true });
}

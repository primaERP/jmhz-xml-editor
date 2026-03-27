// Standalone auto-mount entrypoint
// Injects template and mounts with standalone defaults
var _standaloneTarget = document.getElementById('app');
if (_standaloneTarget) {
  _standaloneTarget.innerHTML = window.JMHZ_VIEWER_TEMPLATE;
  mountJmhzViewer(_standaloneTarget, { manageDocumentTitle: true, warnBeforeUnload: true });
}
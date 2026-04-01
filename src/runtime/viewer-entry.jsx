import { render } from 'solid-js/web';
import ViewerApp from './ViewerApp.jsx';

function mountJmhzViewer(target, options = {}) {
  const mountTarget = typeof target === 'string' ? document.querySelector(target) : target;
  if (!mountTarget) throw new Error('JMHZ Viewer mount target not found');

  const runtimeOptions = {
    xml: null,
    filename: '',
    autoBootstrap: true,
    initialViewMode: null,
    autoValidateOnLoad: false,
    bootstrapScriptId: 'jmhz-data',
    manageDocumentTitle: false,
    warnBeforeUnload: false,
    assetBase: '',
    onReady: null,
    ...options
  };

  const handle = {};
  const dispose = render(() => {
    return <ViewerApp options={runtimeOptions} handle={handle} />;
  }, mountTarget);

  handle.destroy = () => dispose();

  if (typeof runtimeOptions.onReady === 'function') {
    runtimeOptions.onReady(handle);
  }

  return handle;
}

window.JMHZViewerRuntime = { mount: mountJmhzViewer };

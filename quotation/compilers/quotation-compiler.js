'use strict';

(function initializeQuotationCompiler(global) {
  let activeAdapter = null;

  function registerAdapter(adapter) {
    if (!adapter || typeof adapter.compileQuotation !== 'function') throw new TypeError('A quotation compiler adapter must provide compileQuotation().');
    activeAdapter = adapter;
  }

  async function compileQuotation(files, mainFile, options = {}) {
    if (!activeAdapter) {
      const error = new Error('Unable to load quotation rendering engine.');
      error.code = 'ENGINE_UNAVAILABLE';
      throw error;
    }
    const normalizedFiles = files instanceof Map ? files : new Map(Object.entries(files || {}));
    if (!normalizedFiles.has(mainFile)) throw new Error(`Quotation main file is missing: ${mainFile}`);
    const result = await activeAdapter.compileQuotation(normalizedFiles, mainFile, options);
    const blob = result instanceof Blob ? result : result?.blob;
    if (!(blob instanceof Blob) || blob.type !== 'application/pdf') throw new Error('The quotation compiler did not return a PDF.');
    return result instanceof Blob ? {blob, log:'', compiler:activeAdapter.id || 'quotation-compiler'} : result;
  }

  global.LumaQuotationCompiler = Object.freeze({registerAdapter, compileQuotation, getAdapterId:() => activeAdapter?.id || ''});
})(window);

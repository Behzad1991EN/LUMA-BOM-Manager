'use strict';

(function initializeSwiftLatexCompiler(global) {
  const SCRIPT_URL = document.currentScript?.src || new URL('quotation/compilers/swiftlatex-compiler.js', document.baseURI).toString();
  const RUNTIME_BASE = new URL('../vendor/swiftlatex/', SCRIPT_URL);
  const XETEX_WORKER_URL = new URL('luma-swiftlatexxetex-worker.js', RUNTIME_BASE).toString();
  const DVIPDFMX_WORKER_URL = new URL('swiftlatexdvipdfm.js', RUNTIME_BASE).toString();
  const TEXLIVE_ENDPOINT = 'https://texlive.texlyre.org/';
  const ENGINE_TIMEOUT_MS = 300000;
  const PDF_MIME = 'application/pdf';
  let enginesPromise = null;
  let xetexFormatPromise = null;
  let compileInFlight = null;

  function compilerError(message, code, log = '', cause) {
    const error = new Error(message, cause ? {cause} : undefined);
    error.code = code;
    error.log = String(log || '');
    return error;
  }

  function initializeWorker(url, name) {
    return new Promise((resolve, reject) => {
      let worker;
      let settled = false;
      const timeout = setTimeout(() => finish(compilerError(`The ${name} worker did not initialize.`, 'ENGINE_LOAD_FAILED')), ENGINE_TIMEOUT_MS);
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) {
          worker?.terminate();
          reject(error);
        } else {
          worker.onmessage = null;
          worker.onerror = event => console.error(`${name} worker error.`, event?.message || 'Unknown worker error');
          worker.postMessage({cmd:'settexliveurl', url:TEXLIVE_ENDPOINT});
          resolve({name, worker});
        }
      }
      try {
        worker = new Worker(url);
        worker.onmessage = event => event.data?.result === 'ok'
          ? finish()
          : finish(compilerError(`The ${name} worker could not initialize.`, 'ENGINE_LOAD_FAILED'));
        worker.onerror = event => finish(compilerError(`The ${name} worker could not initialize.`, 'ENGINE_LOAD_FAILED', '', event?.error));
      } catch (error) {
        finish(compilerError(`The ${name} worker could not initialize.`, 'ENGINE_LOAD_FAILED', '', error));
      }
    });
  }

  async function ensureEngines(onStatus) {
    if (!enginesPromise) {
      onStatus?.('loading-engine', {progress:8});
      enginesPromise = Promise.all([
        initializeWorker(XETEX_WORKER_URL, 'SwiftLaTeX XeTeX'),
        initializeWorker(DVIPDFMX_WORKER_URL, 'SwiftLaTeX Dvipdfmx'),
      ]).then(([xetex, dvipdfmx]) => ({xetex, dvipdfmx})).catch(error => {
        enginesPromise = null;
        throw error;
      });
    }
    const engines = await enginesPromise;
    onStatus?.('engine-ready', {progress:20});
    return engines;
  }

  function fileDirectories(files) {
    const directories = new Set();
    for (const filename of files.keys()) {
      const parts = filename.split('/').slice(0, -1);
      let current = '';
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        directories.add(current);
      }
    }
    return [...directories].sort((left, right) => left.split('/').length - right.split('/').length);
  }

  function writeFiles(controller, files) {
    controller.worker.postMessage({cmd:'flushcache'});
    for (const directory of fileDirectories(files)) controller.worker.postMessage({cmd:'mkdir', url:directory});
    for (const [filename, source] of files) {
      const content = source instanceof ArrayBuffer ? new Uint8Array(source) : source;
      if (typeof content !== 'string' && !(content instanceof Uint8Array)) throw new TypeError(`Unsupported quotation file content: ${filename}`);
      controller.worker.postMessage({cmd:'writefile', url:filename, src:content});
    }
  }

  function runCompiler(controller, command, mainFile) {
    return new Promise((resolve, reject) => {
      const worker = controller.worker;
      const timeout = setTimeout(() => finish(compilerError(`${controller.name} timed out.`, 'COMPILATION_FAILED')), ENGINE_TIMEOUT_MS);
      function finish(error, result) {
        clearTimeout(timeout);
        worker.onmessage = null;
        worker.onerror = event => console.error(`${controller.name} worker error.`, event?.message || 'Unknown worker error');
        if (error) reject(error); else resolve(result);
      }
      worker.onmessage = event => {
        const data = event.data || {};
        if (data.cmd !== 'compile') return;
        if (data.result !== 'ok' || data.status !== 0 || !data.pdf) {
          finish(compilerError(`${controller.name} compilation failed.`, 'COMPILATION_FAILED', data.log));
          return;
        }
        finish(null, {bytes:new Uint8Array(data.pdf), log:String(data.log || '')});
      };
      worker.onerror = event => finish(compilerError(`${controller.name} compilation failed.`, 'COMPILATION_FAILED', '', event?.error));
      if (mainFile) worker.postMessage({cmd:'setmainfile', url:mainFile});
      worker.postMessage({cmd:command});
    });
  }

  function ensureXeTexFormat(xetex) {
    if (!xetexFormatPromise) {
      xetexFormatPromise = runCompiler(xetex, 'compileformat').then(result => result.bytes).catch(error => {
        xetexFormatPromise = null;
        throw compilerError(
          'The SwiftLaTeX XeTeX format could not be initialized.',
          'ENGINE_LOAD_FAILED',
          error?.log,
          error,
        );
      });
    }
    return xetexFormatPromise;
  }

  async function performCompilation(files, mainFile, options) {
    const onStatus = options?.onStatus;
    const {xetex, dvipdfmx} = await ensureEngines(onStatus);
    onStatus?.('loading-format', {progress:28});
    const formatBytes = await ensureXeTexFormat(xetex);
    const xetexFiles = new Map([['swiftlatexxetex.fmt', formatBytes], ...files]);
    writeFiles(xetex, xetexFiles);
    onStatus?.('compiling-pass-1', {progress:45});
    const firstPass = await runCompiler(xetex, 'compilelatex', mainFile);
    onStatus?.('compiling-pass-2', {progress:67});
    const secondPass = await runCompiler(xetex, 'compilelatex', mainFile);
    const xdvName = mainFile.replace(/\.tex$/i, '.xdv');
    const dvipdfFiles = new Map([...files].filter(([filename]) => !filename.toLowerCase().endsWith('.tex')));
    dvipdfFiles.set(xdvName, secondPass.bytes);
    writeFiles(dvipdfmx, dvipdfFiles);
    onStatus?.('converting-pdf', {progress:86});
    const pdf = await runCompiler(dvipdfmx, 'compilepdf', xdvName);
    onStatus?.('finalizing', {progress:96});
    return {
      blob:new Blob([pdf.bytes], {type:PDF_MIME}),
      log:[firstPass.log, secondPass.log, pdf.log].filter(Boolean).join('\n\n'),
      compiler:'swiftlatex-xetex-v20022022',
    };
  }

  async function compileQuotation(files, mainFile, options = {}) {
    if (compileInFlight) throw compilerError('Quotation generation is already in progress.', 'COMPILER_BUSY');
    compileInFlight = performCompilation(files, mainFile, options);
    try { return await compileInFlight; }
    finally { compileInFlight = null; }
  }

  global.LumaQuotationCompiler.registerAdapter(Object.freeze({id:'swiftlatex-xetex-v20022022', compileQuotation}));
})(window);

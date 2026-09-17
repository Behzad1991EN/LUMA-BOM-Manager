'use strict';

// Keep the official worker unchanged and add the one local-file lookup that its
// 2022 build omits. This lets a generated XeTeX format be mounted in /work.
importScripts('swiftlatexxetex.js');

const swiftLatexRemoteFileLookup = kpse_find_file_impl;
kpse_find_file_impl = function lookupLocalQuotationFile(namePointer, format, mustExist) {
  const requestedName = UTF8ToString(namePointer);
  if (!requestedName.includes('/')) {
    const localPath = `${WORKROOT}/${requestedName}`;
    try {
      const localStat = FS.stat(localPath);
      if (FS.isFile(localStat.mode)) return allocate(intArrayFromString(localPath), 'i8', ALLOC_NORMAL);
    } catch (_) {
      // Missing local files continue through SwiftLaTeX's normal TeX Live lookup.
    }
  }
  return swiftLatexRemoteFileLookup(namePointer, format, mustExist);
};

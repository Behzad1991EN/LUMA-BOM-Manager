# SwiftLaTeX runtime notice

- Upstream project: `SwiftLaTeX/SwiftLaTeX`
- Source: https://github.com/SwiftLaTeX/SwiftLaTeX
- Release: `v20022022` (`20/02/2022`)
- Tag commit: `912068d6f746a58c210eec69053ef72e2ed60b4c`
- Bundling: the four XeTeX/Dvipdfmx worker and WebAssembly files below are copied unchanged from the official `20-02-2022.zip` release asset.
- Repository license: GNU Affero General Public License v3.0 (`LICENSE` is included beside this notice).
- Project adapter: `quotation/compilers/swiftlatex-compiler.js` is LUMA-owned integration code and is not an upstream SwiftLaTeX file.
- Compatibility worker: `luma-swiftlatexxetex-worker.js` is LUMA-owned integration code. It imports the unchanged upstream XeTeX worker and checks its in-memory `/work` folder before falling back to the upstream TeX Live lookup. This is required to reuse the XeTeX format generated in the browser.

Vendored runtime files:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `swiftlatexxetex.js` | 90,170 | `238181805c9d8ffbb231d2ba09323145d485cf85847fc34b8c2168e7b886adb3` |
| `swiftlatexxetex.wasm` | 3,073,718 | `dd7f4f8fe8b07b64c058683edd0298afa1998cfae461cab71bd2571e27ffb673` |
| `swiftlatexdvipdfm.js` | 77,085 | `80d0620536e0a13afaf7ddcf0ccc00c758a6735313a4e962b3a5c8779058ac40` |
| `swiftlatexdvipdfm.wasm` | 700,674 | `1bf8c0d424c87c1548d9d22d29251aa3308506fa6acc29d4f08dcd77ccc1f9b1` |

The release downloads TeX support files on demand. The original 2022 SwiftLaTeX host is no longer reliable, so the LUMA adapter uses TeXlyre's public TeX Live 2020-compatible endpoint at `https://texlive.texlyre.org/`. The executable runtime is locally hosted and document compilation stays in the browser; package/font filenames are fetched on demand, so a first compilation still requires network access.

"""Convert a STEP model to a binary STL using an installed OpenCascade Python binding.

Usage:
    python tools/step_to_stl.py input.step output.stl [linear_deflection]
"""

from __future__ import annotations

import pathlib
import sys

from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_Reader
from OCP.StlAPI import StlAPI_Writer


def convert(source: pathlib.Path, destination: pathlib.Path, linear_deflection: float) -> None:
    reader = STEPControl_Reader()
    status = reader.ReadFile(str(source))
    if status != IFSelect_RetDone:
        raise RuntimeError(f"OpenCascade could not read {source.name} (status {status}).")

    transferred = reader.TransferRoots()
    if transferred < 1:
        raise RuntimeError(f"OpenCascade found no transferable roots in {source.name}.")

    shape = reader.OneShape()
    mesh = BRepMesh_IncrementalMesh(shape, linear_deflection, False, 0.25, True)
    mesh.Perform()
    if not mesh.IsDone():
        raise RuntimeError(f"OpenCascade could not tessellate {source.name}.")

    destination.parent.mkdir(parents=True, exist_ok=True)
    writer = StlAPI_Writer()
    writer.ASCIIMode = False
    if not writer.Write(shape, str(destination)):
        raise RuntimeError(f"OpenCascade could not write {destination.name}.")


def main() -> int:
    if len(sys.argv) not in (3, 4):
        print("Usage: step_to_stl.py input.step output.stl [linear_deflection]", file=sys.stderr)
        return 2
    source = pathlib.Path(sys.argv[1]).resolve()
    destination = pathlib.Path(sys.argv[2]).resolve()
    linear_deflection = float(sys.argv[3]) if len(sys.argv) == 4 else 0.45
    if not source.is_file():
        raise FileNotFoundError(source)
    if linear_deflection <= 0:
        raise ValueError("linear_deflection must be positive")
    convert(source, destination, linear_deflection)
    print(f"{destination} | {destination.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

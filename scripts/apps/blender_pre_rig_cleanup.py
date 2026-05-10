#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path
from typing import Any

try:
    import bmesh
    import bpy
    from mathutils import Vector
except ImportError as error:  # pragma: no cover - runs inside Blender
    print(f"Este helper debe ejecutarse dentro de Blender: {error}", file=sys.stderr)
    raise SystemExit(2) from error


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def parse_config_path(argv: list[str]) -> Path:
    if "--" not in argv:
        raise ValueError("Falta el separador -- con la ruta del config JSON.")
    separator_index = argv.index("--")
    if separator_index + 1 >= len(argv):
        raise ValueError("Falta la ruta del config JSON.")
    return Path(argv[separator_index + 1]).expanduser().resolve()


def deselect_all() -> None:
    bpy.ops.object.select_all(action="DESELECT")


def select_objects(objects: list[Any]) -> None:
    deselect_all()
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data_block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(data_block):
            if item.users == 0:
                data_block.remove(item)


def import_model(source_model_path: Path) -> None:
    suffix = source_model_path.suffix.lower()
    filepath = str(source_model_path)

    if suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=filepath)
        return
    if suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=filepath)
        return
    if suffix == ".obj":
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=filepath)
        else:
            bpy.ops.import_scene.obj(filepath=filepath)
        return
    if suffix == ".ply":
        if hasattr(bpy.ops.wm, "ply_import"):
            bpy.ops.wm.ply_import(filepath=filepath)
        else:
            bpy.ops.import_mesh.ply(filepath=filepath)
        return
    if suffix == ".stl":
        if hasattr(bpy.ops.wm, "stl_import"):
            bpy.ops.wm.stl_import(filepath=filepath)
        else:
            bpy.ops.import_mesh.stl(filepath=filepath)
        return

    raise ValueError(f"Extension no soportada dentro de Blender: {suffix!r}")


def get_mesh_objects() -> list[Any]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def face_count(mesh_objects: list[Any]) -> int:
    return sum(len(obj.data.polygons) for obj in mesh_objects)


def vertex_count(mesh_objects: list[Any]) -> int:
    return sum(len(obj.data.vertices) for obj in mesh_objects)


def bounds_world(mesh_objects: list[Any]) -> tuple[Vector, Vector]:
    coords: list[Vector] = []
    for obj in mesh_objects:
        coords.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not coords:
        zero = Vector((0.0, 0.0, 0.0))
        return zero, zero

    minimum = Vector(
        (
            min(coord.x for coord in coords),
            min(coord.y for coord in coords),
            min(coord.z for coord in coords),
        )
    )
    maximum = Vector(
        (
            max(coord.x for coord in coords),
            max(coord.y for coord in coords),
            max(coord.z for coord in coords),
        )
    )
    return minimum, maximum


def bbox_metrics(mesh_objects: list[Any]) -> dict[str, Any]:
    minimum, maximum = bounds_world(mesh_objects)
    size = maximum - minimum
    center = (minimum + maximum) / 2.0
    return {
        "min": [round(minimum.x, 6), round(minimum.y, 6), round(minimum.z, 6)],
        "max": [round(maximum.x, 6), round(maximum.y, 6), round(maximum.z, 6)],
        "size": [round(size.x, 6), round(size.y, 6), round(size.z, 6)],
        "center": [round(center.x, 6), round(center.y, 6), round(center.z, 6)],
    }


def collect_stats(mesh_objects: list[Any]) -> dict[str, Any]:
    return {
        "mesh_count": len(mesh_objects),
        "face_count": face_count(mesh_objects),
        "vertex_count": vertex_count(mesh_objects),
        "bounds": bbox_metrics(mesh_objects),
    }


def apply_rotation_and_scale(mesh_objects: list[Any]) -> None:
    for obj in mesh_objects:
        select_objects([obj])
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def center_and_floor(mesh_objects: list[Any]) -> None:
    minimum, maximum = bounds_world(mesh_objects)
    delta = Vector(
        (
            -((minimum.x + maximum.x) / 2.0),
            -((minimum.y + maximum.y) / 2.0),
            -minimum.z,
        )
    )
    for obj in mesh_objects:
        obj.location += delta
    bpy.context.view_layer.update()


def cleanup_topology(mesh_objects: list[Any]) -> None:
    for obj in mesh_objects:
        select_objects([obj])
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.mesh.delete_loose()
        bpy.ops.object.mode_set(mode="OBJECT")


def remove_small_components(
    obj: Any,
    *,
    ratio_threshold: float,
    max_vertices: int,
) -> int:
    bm = bmesh.new()
    try:
        bm.from_mesh(obj.data)
        bm.verts.ensure_lookup_table()

        total_vertices = max(len(bm.verts), 1)
        visited: set[int] = set()
        components: list[list[Any]] = []

        for vert in bm.verts:
            if vert.index in visited:
                continue

            stack = [vert]
            component: list[Any] = []
            visited.add(vert.index)

            while stack:
                current = stack.pop()
                component.append(current)
                for edge in current.link_edges:
                    other = edge.other_vert(current)
                    if other.index in visited:
                        continue
                    visited.add(other.index)
                    stack.append(other)

            components.append(component)

        if len(components) <= 1:
            return 0

        vertices_to_delete: list[Any] = []
        removed_components = 0
        for component in components:
            component_ratio = len(component) / total_vertices
            if len(component) > max_vertices and component_ratio >= ratio_threshold:
                continue
            vertices_to_delete.extend(component)
            removed_components += 1

        if vertices_to_delete:
            bmesh.ops.delete(bm, geom=vertices_to_delete, context="VERTS")
            bm.to_mesh(obj.data)
            obj.data.update()
        return removed_components
    finally:
        bm.free()


def world_aabb(obj: Any) -> tuple[Vector, Vector]:
    coords = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    minimum = Vector(
        (
            min(coord.x for coord in coords),
            min(coord.y for coord in coords),
            min(coord.z for coord in coords),
        )
    )
    maximum = Vector(
        (
            max(coord.x for coord in coords),
            max(coord.y for coord in coords),
            max(coord.z for coord in coords),
        )
    )
    return minimum, maximum


def aabb_overlap(a: Any, b: Any) -> bool:
    a_min, a_max = world_aabb(a)
    b_min, b_max = world_aabb(b)
    epsilon = 0.005
    return (
        a_min.x <= b_max.x + epsilon
        and a_max.x >= b_min.x - epsilon
        and a_min.y <= b_max.y + epsilon
        and a_max.y >= b_min.y - epsilon
        and a_min.z <= b_max.z + epsilon
        and a_max.z >= b_min.z - epsilon
    )


def maybe_join_mesh_objects(mesh_objects: list[Any], enabled: bool) -> tuple[bool, str]:
    if not enabled:
        return False, "join_mesh_parts disabled"
    if len(mesh_objects) <= 1:
        return False, "single mesh"

    has_overlap = False
    for index, current in enumerate(mesh_objects):
        for other in mesh_objects[index + 1 :]:
            if aabb_overlap(current, other):
                has_overlap = True
                break
        if has_overlap:
            break

    if not has_overlap:
        return False, "no overlapping mesh parts detected"

    select_objects(mesh_objects)
    bpy.ops.object.join()
    return True, "joined overlapping mesh parts"


def maybe_decimate_meshes(
    mesh_objects: list[Any],
    *,
    enabled: bool,
    threshold: int,
    target_face_count: int,
) -> tuple[bool, float]:
    current_faces = face_count(mesh_objects)
    if not enabled or current_faces <= threshold or target_face_count <= 0:
        return False, 1.0
    if current_faces <= target_face_count:
        return False, 1.0

    ratio = max(min(target_face_count / current_faces, 1.0), 0.01)
    for obj in mesh_objects:
        select_objects([obj])
        modifier = obj.modifiers.new(name="OpenClawDecimate", type="DECIMATE")
        modifier.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return True, ratio


def export_cleaned_outputs(
    mesh_objects: list[Any],
    *,
    cleaned_obj_path: Path,
    cleaned_glb_path: Path,
) -> None:
    select_objects(mesh_objects)

    cleaned_obj_path.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(bpy.ops.wm, "obj_export"):
        bpy.ops.wm.obj_export(
            filepath=str(cleaned_obj_path),
            export_selected_objects=True,
        )
    else:
        bpy.ops.export_scene.obj(
            filepath=str(cleaned_obj_path),
            use_selection=True,
            use_materials=False,
        )

    bpy.ops.export_scene.gltf(
        filepath=str(cleaned_glb_path),
        export_format="GLB",
        use_selection=True,
    )


def save_working_blend(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))


def main(argv: list[str]) -> int:
    config_path = parse_config_path(argv)
    config = json.loads(config_path.read_text(encoding="utf-8"))

    report_path = Path(config["report_json_path"]).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    source_model_path = Path(config["source_model_path"]).expanduser().resolve()
    cleaned_obj_path = Path(config["cleaned_obj_path"]).expanduser().resolve()
    cleaned_glb_path = Path(config["cleaned_glb_path"]).expanduser().resolve()
    working_blend_path = Path(config["working_blend_path"]).expanduser().resolve()

    warnings: list[str] = []
    actions: list[str] = []

    try:
        clear_scene()
        import_model(source_model_path)
        mesh_objects = get_mesh_objects()
        if not mesh_objects:
            raise RuntimeError("Blender no encontro objetos MESH despues del import.")

        before = collect_stats(mesh_objects)
        actions.append("import model")

        apply_rotation_and_scale(mesh_objects)
        actions.append("apply rotation and scale")

        center_and_floor(mesh_objects)
        actions.append("center character and place lowest point on Z=0")

        cleanup_topology(mesh_objects)
        actions.append("recalculate normals and delete loose geometry")

        removed_small_components = 0
        if bool(config.get("remove_small_floaters", False)):
            for obj in list(get_mesh_objects()):
                removed_small_components += remove_small_components(
                    obj,
                    ratio_threshold=float(config.get("small_component_vertex_ratio", 0.005)),
                    max_vertices=int(config.get("small_component_max_vertices", 500)),
                )
            actions.append("remove very small disconnected components")
        else:
            warnings.append("small floater removal skipped by mode or config")

        mesh_objects = get_mesh_objects()
        joined_meshes, join_reason = maybe_join_mesh_objects(
            mesh_objects,
            bool(config.get("join_mesh_parts", True)),
        )
        actions.append(join_reason)

        mesh_objects = get_mesh_objects()
        center_and_floor(mesh_objects)

        decimation_applied, decimation_ratio = maybe_decimate_meshes(
            mesh_objects,
            enabled=bool(config.get("allow_decimate", False)),
            threshold=int(config.get("decimate_face_threshold", 250000)),
            target_face_count=int(config.get("target_face_count", 150000)),
        )
        if decimation_applied:
            actions.append(f"decimate mesh to ratio {decimation_ratio:.4f}")
        else:
            actions.append("decimation not applied")

        mesh_objects = get_mesh_objects()
        center_and_floor(mesh_objects)
        export_cleaned_outputs(
            mesh_objects,
            cleaned_obj_path=cleaned_obj_path,
            cleaned_glb_path=cleaned_glb_path,
        )
        actions.append("export cleaned obj and glb")
        save_working_blend(working_blend_path)
        actions.append("save working blend")

        after = collect_stats(mesh_objects)
        if after["mesh_count"] > 1:
            warnings.append("multiple mesh objects remain after cleanup")

        report = {
            "status": "pass",
            "message": "Cleanup pre-rig completed in Blender.",
            "mode": config.get("mode", "auto"),
            "source_model_path": str(source_model_path),
            "cleaned_obj_path": str(cleaned_obj_path),
            "cleaned_glb_path": str(cleaned_glb_path),
            "working_blend_path": str(working_blend_path),
            "before": before,
            "after": after,
            "actions": actions,
            "warnings": warnings,
            "joined_meshes": joined_meshes,
            "join_reason": join_reason,
            "removed_small_components": removed_small_components,
            "decimation_applied": decimation_applied,
            "decimation_ratio": round(decimation_ratio, 6),
        }
        write_json(report_path, report)
        return 0
    except Exception as error:  # pragma: no cover - defensive path for Blender runtime
        report = {
            "status": "fail_runtime",
            "message": f"Blender cleanup failed: {error}",
            "warnings": warnings,
            "actions": actions,
            "traceback": traceback.format_exc(),
        }
        write_json(report_path, report)
        print(report["traceback"], file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

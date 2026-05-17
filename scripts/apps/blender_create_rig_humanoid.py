#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
import traceback
from pathlib import Path
from typing import Any

try:
    import addon_utils
    import bpy
    from mathutils import Vector
except ImportError as error:  # pragma: no cover - runs inside Blender
    print(f"Este helper debe ejecutarse dentro de Blender: {error}", file=sys.stderr)
    raise SystemExit(2) from error


POSE_ORDER = ("arms", "elbows", "knees", "head", "torso")
POSE_BONES: dict[str, list[tuple[list[str], tuple[float, float, float]]]] = {
    "arms": [
        (["upper_arm_fk.L", "upper_arm.L", "DEF-upper_arm.L"], (math.radians(-72), 0.0, 0.0)),
        (["upper_arm_fk.R", "upper_arm.R", "DEF-upper_arm.R"], (math.radians(-72), 0.0, 0.0)),
    ],
    "elbows": [
        (["forearm_fk.L", "forearm.L", "DEF-forearm.L"], (math.radians(-68), 0.0, 0.0)),
        (["forearm_fk.R", "forearm.R", "DEF-forearm.R"], (math.radians(-68), 0.0, 0.0)),
    ],
    "knees": [
        (["shin_fk.L", "shin.L", "DEF-shin.L"], (math.radians(48), 0.0, 0.0)),
        (["shin_fk.R", "shin.R", "DEF-shin.R"], (math.radians(48), 0.0, 0.0)),
    ],
    "head": [
        (["head", "head_fk", "DEF-spine.006"], (0.0, 0.0, math.radians(28))),
    ],
    "torso": [
        (["torso", "spine_fk.003", "spine_fk.002", "spine"], (math.radians(16), 0.0, 0.0)),
    ],
}


class RiggingQualityIssue(RuntimeError):
    pass


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


def ensure_addon_enabled(module_name: str) -> None:
    if not any(module.__name__ == module_name for module in addon_utils.modules()):
        raise RuntimeError(f"No existe el add-on requerido: {module_name}")

    _, enabled_before = addon_utils.check(module_name)
    if not enabled_before:
        bpy.ops.preferences.addon_enable(module=module_name)

    _, enabled_after = addon_utils.check(module_name)
    if not enabled_after:
        raise RuntimeError(f"No se pudo habilitar el add-on requerido: {module_name}")


def deselect_all() -> None:
    try:
        bpy.ops.object.select_all(action="DESELECT")
    except RuntimeError:
        for obj in bpy.context.scene.objects:
            obj.select_set(False)


def select_objects(objects: list[Any], *, active_index: int = 0) -> None:
    deselect_all()
    for obj in objects:
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[active_index]


def safe_mode_set(mode: str) -> None:
    try:
        bpy.ops.object.mode_set(mode=mode)
    except RuntimeError as error:
        active_obj = bpy.context.view_layer.objects.active
        active_name = active_obj.name if active_obj is not None else "<none>"
        raise RuntimeError(
            f"No se pudo cambiar a mode={mode} con active={active_name}"
        ) from error


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data_block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(data_block):
            if item.users == 0:
                data_block.remove(item)


def import_model(path: Path) -> None:
    suffix = path.suffix.lower()
    filepath = str(path)

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


def mesh_bounds(mesh_objects: list[Any]) -> tuple[Vector, Vector]:
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


def mesh_size(mesh_objects: list[Any]) -> Vector:
    minimum, maximum = mesh_bounds(mesh_objects)
    return maximum - minimum


def center_and_floor(mesh_objects: list[Any]) -> None:
    minimum, maximum = mesh_bounds(mesh_objects)
    delta = Vector((
        -((minimum.x + maximum.x) / 2.0),
        -((minimum.y + maximum.y) / 2.0),
        -minimum.z,
    ))
    for obj in mesh_objects:
        obj.location += delta
    bpy.context.view_layer.update()


def maybe_join_meshes(mesh_objects: list[Any]) -> list[Any]:
    if len(mesh_objects) <= 1:
        return mesh_objects

    select_objects(mesh_objects)
    bpy.ops.object.join()
    joined = get_mesh_objects()
    return joined


def configure_render_scene(mesh_objects: list[Any]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (0.96, 0.97, 0.99, 1.0)
    background.inputs[1].default_value = 0.9

    minimum, maximum = mesh_bounds(mesh_objects)
    center = (minimum + maximum) / 2.0
    extent = maximum - minimum
    max_dim = max(extent.x, extent.y, extent.z, 0.001)

    bpy.ops.object.light_add(type="AREA", location=(center.x + max_dim * 1.8, center.y - max_dim * 1.8, center.z + max_dim * 2.2))
    key_light = bpy.context.active_object
    key_light.data.energy = 3000
    key_light.scale = (1.5, 1.5, 1.0)

    bpy.ops.object.light_add(type="AREA", location=(center.x - max_dim * 1.7, center.y + max_dim * 1.5, center.z + max_dim * 1.7))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 1100
    fill_light.scale = (1.1, 1.1, 1.0)

    bpy.ops.object.camera_add(location=(center.x + max_dim * 2.7, center.y - max_dim * 2.2, center.z + max_dim * 1.6))
    camera = bpy.context.active_object
    direction = center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera

    for light in (key_light, fill_light):
        direction = center - light.location
        light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_and_align_metarig(mesh_objects: list[Any]) -> Any:
    minimum, maximum = mesh_bounds(mesh_objects)
    center = (minimum + maximum) / 2.0
    extent = maximum - minimum
    height = max(extent.z, 1e-3)

    bpy.ops.object.armature_human_metarig_add()
    metarig = bpy.context.active_object
    metarig.name = "OpenClawMetaRig"
    metarig.location = (center.x, center.y, minimum.z)
    scale_value = max(height * 0.58, 0.18)
    metarig.scale = (scale_value, scale_value, scale_value)
    bpy.context.view_layer.update()
    return metarig


def generate_rig_from_metarig(metarig: Any) -> Any:
    known_armatures = {obj.name for obj in bpy.context.scene.objects if obj.type == "ARMATURE"}
    select_objects([metarig])
    safe_mode_set("OBJECT")
    result = bpy.ops.pose.rigify_generate()
    if "FINISHED" not in result:
        raise RuntimeError("Rigify no pudo generar el rig final.")

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    generated = [obj for obj in armatures if obj.name not in known_armatures]
    if not generated:
        generated = [obj for obj in armatures if obj.name != metarig.name]
    if not generated:
        raise RuntimeError("Rigify no publico un objeto ARMATURE de salida.")

    rig = generated[-1]
    rig.name = "OpenClawRig"
    return rig


def parent_with_automatic_weights(mesh_objects: list[Any], rig: Any) -> None:
    select_objects(mesh_objects + [rig], active_index=len(mesh_objects))
    result = bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    if "FINISHED" not in result:
        raise RiggingQualityIssue(
            "model not suitable for humanoid rigging: automatic weights no pudo aplicarse"
        )


def reset_pose(rig: Any) -> None:
    select_objects([rig])
    safe_mode_set("POSE")
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.location = (0.0, 0.0, 0.0)
        pose_bone.rotation_euler = (0.0, 0.0, 0.0)
        pose_bone.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()


def find_pose_bone(rig: Any, candidates: list[str]) -> Any | None:
    for name in candidates:
        bone = rig.pose.bones.get(name)
        if bone is not None:
            return bone
    return None


def apply_pose(rig: Any, pose_name: str) -> tuple[list[str], list[str]]:
    missing_bones: list[str] = []
    used_bones: list[str] = []
    instructions = POSE_BONES[pose_name]
    for candidates, rotation_xyz in instructions:
        pose_bone = find_pose_bone(rig, candidates)
        if pose_bone is None:
            missing_bones.append("|".join(candidates))
            continue
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = rotation_xyz
        used_bones.append(pose_bone.name)

    bpy.context.view_layer.update()
    return used_bones, missing_bones


def deformation_score(base_size: Vector, current_size: Vector) -> float:
    deltas = []
    for base_value, current_value in zip(base_size, current_size):
        safe_base = max(abs(base_value), 1e-4)
        deltas.append(abs(current_value - base_value) / safe_base)
    return max(deltas) if deltas else 0.0


def render_preview(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def run_pose_suite(
    *,
    rig: Any,
    mesh_objects: list[Any],
    validation_dir: Path,
) -> tuple[dict[str, Any], list[str]]:
    validation_dir.mkdir(parents=True, exist_ok=True)
    base_size = mesh_size(mesh_objects)

    pose_payload: dict[str, Any] = {}
    pose_artifacts: dict[str, str] = {}
    warnings: list[str] = []

    for pose_name in POSE_ORDER:
        reset_pose(rig)
        used_bones, missing_bones = apply_pose(rig, pose_name)
        current_score = round(deformation_score(base_size, mesh_size(mesh_objects)), 6)

        pose_status = "pass"
        if missing_bones:
            pose_status = "fail_quality"
            warnings.append(
                f"pose={pose_name} missing bones for candidates: {', '.join(missing_bones)}"
            )
        elif current_score > 0.35:
            pose_status = "fail_quality"
            warnings.append(
                f"pose={pose_name} deformation_score={current_score:.4f} excede umbral 0.35"
            )

        preview_path = validation_dir / f"{pose_name}.png"
        render_preview(preview_path)
        pose_artifacts[pose_name] = str(preview_path)
        pose_payload[pose_name] = {
            "status": pose_status,
            "deformation_score": current_score,
            "used_bones": used_bones,
            "missing_bones": missing_bones,
            "preview_path": str(preview_path),
        }

    reset_pose(rig)
    return {
        "suite": "basic_humanoid_v1",
        "poses": pose_payload,
        "artifacts": pose_artifacts,
    }, warnings


def classify_pose_status(pose_validation: dict[str, Any]) -> str:
    poses = pose_validation.get("poses", {})
    if not isinstance(poses, dict) or not poses:
        return "fail_quality"

    failed = [name for name, payload in poses.items() if payload.get("status") != "pass"]
    if not failed:
        return "pass"
    if len(failed) <= 2:
        return "soft_pass_with_fallback"
    return "fail_quality"


def export_outputs(config: dict[str, Any], *, rig: Any, mesh_objects: list[Any]) -> None:
    export_glb = bool(config.get("export_glb", True))
    export_fbx = bool(config.get("export_fbx", True))

    export_objects = mesh_objects + [rig]
    select_objects(export_objects)
    safe_mode_set("OBJECT")

    if export_glb:
        target = Path(config["rigged_glb_path"]).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(
            filepath=str(target),
            export_format="GLB",
            use_selection=True,
            export_animations=False,
        )

    if export_fbx:
        target = Path(config["rigged_fbx_path"]).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.fbx(
            filepath=str(target),
            use_selection=True,
            bake_anim=False,
        )


def save_working_blend(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))


def run(argv: list[str]) -> int:
    config_path = parse_config_path(argv)
    config = json.loads(config_path.read_text(encoding="utf-8"))

    report_path = Path(config["report_json_path"]).expanduser().resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    prepared_model_path = Path(config["prepared_model_path"]).expanduser().resolve()
    working_blend_path = Path(config["working_blend_path"]).expanduser().resolve()
    validation_dir = Path(config["validation_dir"]).expanduser().resolve()

    warnings: list[str] = []
    actions: list[str] = []

    payload: dict[str, Any] = {
        "status": "running",
        "message": "create_rig_humanoid running",
        "mode": config.get("mode", "auto"),
        "pose_suite": config.get("pose_suite", "basic_humanoid_v1"),
        "source_model_path": str(prepared_model_path),
        "working_blend_path": str(working_blend_path),
        "rigged_glb_path": str(Path(config["rigged_glb_path"]).expanduser().resolve()),
        "rigged_fbx_path": str(Path(config["rigged_fbx_path"]).expanduser().resolve()),
        "warnings": warnings,
        "actions": actions,
    }

    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        clear_scene()
        actions.append("clear scene")

        ensure_addon_enabled("rigify")
        ensure_addon_enabled("io_scene_gltf2")
        ensure_addon_enabled("io_scene_fbx")
        actions.append("ensure required addons")

        import_model(prepared_model_path)
        mesh_objects = get_mesh_objects()
        if not mesh_objects:
            raise RiggingQualityIssue("model not suitable for humanoid rigging: no mesh objects after import")
        actions.append("import prepared model")

        mesh_objects = maybe_join_meshes(mesh_objects)
        center_and_floor(mesh_objects)
        actions.append("normalize placement and floor alignment")

        configure_render_scene(mesh_objects)
        actions.append("configure render preview scene")

        metarig = add_and_align_metarig(mesh_objects)
        actions.append("add and align Rigify metarig")

        rig = generate_rig_from_metarig(metarig)
        actions.append("generate rig with Rigify")

        try:
            parent_with_automatic_weights(mesh_objects, rig)
        except RuntimeError as error:
            raise RiggingQualityIssue(
                "model not suitable for humanoid rigging: automatic weights failed"
            ) from error
        actions.append("bind mesh using automatic weights")

        pose_validation, pose_warnings = run_pose_suite(
            rig=rig,
            mesh_objects=mesh_objects,
            validation_dir=validation_dir,
        )
        warnings.extend(pose_warnings)
        payload["pose_validation"] = pose_validation
        actions.append("execute pose validation suite")

        export_outputs(config, rig=rig, mesh_objects=mesh_objects)
        actions.append("export rigged outputs (glb/fbx)")

        save_working_blend(working_blend_path)
        actions.append("save rigging working blend")

        final_status = classify_pose_status(pose_validation)
        if final_status == "pass":
            final_message = "rig created successfully"
        elif final_status == "soft_pass_with_fallback":
            final_message = "rig created with minor deformation warnings"
        else:
            final_message = "model not suitable for humanoid rigging"

        payload["status"] = final_status
        payload["message"] = final_message
        write_json(report_path, payload)
        return 0
    except RiggingQualityIssue as error:
        payload["status"] = "fail_quality"
        payload["message"] = str(error)
        payload["traceback"] = traceback.format_exc()
        write_json(report_path, payload)
        return 0
    except Exception as error:  # pragma: no cover - defensive path for Blender runtime
        payload["status"] = "fail_runtime"
        payload["message"] = f"create_rig_humanoid failed: {error}"
        payload["traceback"] = traceback.format_exc()
        write_json(report_path, payload)
        print(payload["traceback"], file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(run(sys.argv))

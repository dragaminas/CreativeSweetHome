#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import sys
import warnings
from pathlib import Path
from typing import Any

import addon_utils
import bpy
from mathutils import Vector


REQUIRED_ADDONS = ("rigify", "io_scene_gltf2", "io_scene_fbx")

warnings.filterwarnings("ignore", category=DeprecationWarning)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def parse_args() -> tuple[Path, Path, str]:
    if "--" not in sys.argv:
        raise SystemExit(
            "usage: blender_rigging_smoke_test.py -- <output_dir> <report_path> <audit|apply>"
        )

    dash_index = sys.argv.index("--")
    args = sys.argv[dash_index + 1 :]
    if len(args) != 3:
        raise SystemExit(
            "usage: blender_rigging_smoke_test.py -- <output_dir> <report_path> <audit|apply>"
        )

    output_dir = Path(args[0]).expanduser().resolve()
    report_path = Path(args[1]).expanduser().resolve()
    persist_mode = args[2].strip().lower()
    if persist_mode not in {"audit", "apply"}:
        raise SystemExit(f"persist_mode invalido: {persist_mode}")
    return output_dir, report_path, persist_mode


def addon_module_exists(module_name: str) -> bool:
    return any(module.__name__ == module_name for module in addon_utils.modules())


def ensure_addon_enabled(module_name: str) -> dict[str, Any]:
    default_enabled, enabled_before = addon_utils.check(module_name)
    payload = {
        "module": module_name,
        "module_present": addon_module_exists(module_name),
        "default_enabled": bool(default_enabled),
        "enabled_before": bool(enabled_before),
        "enabled_after": bool(enabled_before),
    }

    if not payload["module_present"]:
        raise RuntimeError(f"No existe el add-on requerido: {module_name}")

    if not enabled_before:
        bpy.ops.preferences.addon_enable(module=module_name)

    _, enabled_after = addon_utils.check(module_name)
    payload["enabled_after"] = bool(enabled_after)
    if not enabled_after:
        raise RuntimeError(f"No se pudo habilitar el add-on requerido: {module_name}")

    return payload


def save_user_preferences() -> None:
    result = bpy.ops.wm.save_userpref()
    if "FINISHED" not in result:
        raise RuntimeError("Blender no pudo guardar userpref tras habilitar add-ons")


def point_camera_at(camera: bpy.types.Object, target: Vector) -> None:
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners: list[Vector] = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    return minimum, maximum


def build_scene(output_dir: Path) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    blend_path = output_dir / "rigging-smoke.blend"
    render_path = output_dir / "rigging-smoke.png"
    glb_path = output_dir / "rigging-smoke.glb"
    fbx_path = output_dir / "rigging-smoke.fbx"

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(render_path)
    scene.render.film_transparent = False

    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (0.96, 0.97, 0.99, 1.0)
    background.inputs[1].default_value = 0.85

    bpy.ops.object.armature_human_metarig_add()
    metarig = bpy.context.active_object
    metarig.name = "RigifyMetaRig"
    metarig.location = (0.0, 0.0, 0.0)
    metarig.scale = (1.0, 1.0, 1.0)

    bpy.ops.mesh.primitive_uv_sphere_add(location=(0.0, 0.0, 1.15), scale=(0.38, 0.26, 0.58))
    mesh = bpy.context.active_object
    mesh.name = "RiggingSmokeBody"

    material = bpy.data.materials.new(name="RiggingSmokeMaterial")
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError("No se encontro Principled BSDF para el material de smoke")
    bsdf.inputs["Base Color"].default_value = (0.73, 0.79, 0.86, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.05
    bsdf.inputs["Roughness"].default_value = 0.58
    mesh.data.materials.clear()
    mesh.data.materials.append(material)

    bpy.ops.object.light_add(type="AREA", location=(2.6, -2.4, 3.2))
    key_light = bpy.context.active_object
    key_light.data.energy = 3200
    key_light.scale = (1.6, 1.6, 1.0)

    bpy.ops.object.light_add(type="AREA", location=(-2.1, 1.6, 2.4))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 1200
    fill_light.scale = (1.2, 1.2, 1.0)

    render_objects = [obj for obj in scene.objects if obj.type in {"MESH", "ARMATURE"}]
    minimum, maximum = world_bounds(render_objects)
    center = (minimum + maximum) / 2.0
    extent = maximum - minimum
    max_dim = max(extent.x, extent.y, extent.z, 0.001)

    bpy.ops.object.camera_add(
        location=(center.x + max_dim * 2.4, center.y - max_dim * 2.2, center.z + max_dim * 1.5)
    )
    camera = bpy.context.active_object
    point_camera_at(camera, center)
    scene.camera = camera

    point_camera_at(key_light, center)
    point_camera_at(fill_light, center)

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", use_selection=False)
    bpy.ops.export_scene.fbx(filepath=str(fbx_path), use_selection=False)

    return {
        "blend_path": str(blend_path),
        "render_path": str(render_path),
        "glb_path": str(glb_path),
        "fbx_path": str(fbx_path),
    }


def main() -> None:
    output_dir, report_path, persist_mode = parse_args()
    payload: dict[str, Any] = {
        "status": "running",
        "persist_mode": persist_mode,
        "blender_version": bpy.app.version_string,
        "addons": {},
        "artifacts": {},
        "warnings": [],
    }

    try:
        bpy.ops.wm.read_factory_settings(use_empty=True)

        addons_payload: dict[str, Any] = {}
        for module_name in REQUIRED_ADDONS:
            addons_payload[module_name] = ensure_addon_enabled(module_name)
        payload["addons"] = addons_payload

        if persist_mode == "apply":
            save_user_preferences()
            payload["preferences_saved"] = True
        else:
            payload["preferences_saved"] = False

        payload["operators"] = {
            "armature_human_metarig_add": bool(hasattr(bpy.ops.object, "armature_human_metarig_add")),
            "export_scene_gltf": bool(hasattr(bpy.ops.export_scene, "gltf")),
            "export_scene_fbx": bool(hasattr(bpy.ops.export_scene, "fbx")),
        }
        payload["artifacts"] = build_scene(output_dir)

        for artifact_path in payload["artifacts"].values():
            if not Path(artifact_path).is_file():
                raise RuntimeError(f"No se genero el artefacto esperado: {artifact_path}")

        payload["status"] = "pass"
        payload["message"] = (
            "Rigify, export glTF/FBX y preview render estan disponibles en Blender background."
        )
    except Exception as error:
        payload["status"] = "fail_runtime"
        payload["message"] = str(error)
        write_json(report_path, payload)
        raise

    write_json(report_path, payload)


main()

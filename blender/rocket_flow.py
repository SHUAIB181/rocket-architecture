"""
Blender rocket flight animation -> assets/rocket_flow.mp4 (+ assets/rocket.glb)
Run (Blender 3.6+ / 4.x):  blender -b -P blender/rocket_flow.py
Or open Blender > Scripting tab > open this file > Run Script.
Edit the PARAMETERS below to change colours, length and speed.
"""
import bpy, math, os, random
from mathutils import Vector

FRAMES, FPS, RES = 150, 30, (1280, 720)
BODY, ACCENT, FLAME = (0.93, 0.94, 0.96, 1), (0.10, 0.45, 1.0, 1), (1.0, 0.55, 0.12, 1)
OUT = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath or __file__), "..", "assets"))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, FRAMES
sc.render.fps = FPS
sc.render.resolution_x, sc.render.resolution_y = RES

def mat(name, color, metal=0.0, rough=0.4, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color; b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit:
        for key in ("Emission Color", "Emission"):
            if key in b.inputs: b.inputs[key].default_value = color; break
        if "Emission Strength" in b.inputs: b.inputs["Emission Strength"].default_value = emit
    return m

def put(obj, m, parent=None):
    obj.data.materials.append(m)
    if parent: obj.parent = parent
    return obj

# --- rocket (built along +Z, origin at base) ---
root = bpy.data.objects.new("Rocket", None); sc.collection.objects.link(root)
bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=3.2, location=(0, 0, 1.6)); put(bpy.context.object, mat("Body", BODY, 0.6, 0.25), root)
bpy.ops.mesh.primitive_cone_add(radius1=0.5, radius2=0.02, depth=1.1, location=(0, 0, 3.75)); put(bpy.context.object, mat("Nose", ACCENT, 0.4, 0.3), root)
bpy.ops.mesh.primitive_cylinder_add(radius=0.52, depth=0.18, location=(0, 0, 2.3)); put(bpy.context.object, mat("Band", ACCENT, 0.4, 0.3), root)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(0, -0.46, 2.7)); bpy.context.object.scale.y = 0.4; put(bpy.context.object, mat("Window", (0.05, 0.1, 0.25, 1), 0.9, 0.1, 0.6), root)
for i in range(3):
    a = i * 2 * math.pi / 3
    bpy.ops.mesh.primitive_cube_add(size=1, location=(math.cos(a) * 0.62, math.sin(a) * 0.62, 0.55))
    f = bpy.context.object; f.scale = (0.08, 0.7, 0.9); f.rotation_euler = (0, 0, a + math.pi / 2); put(f, mat("Fin%d" % i, (0.55, 0.58, 0.63, 1), 0.7, 0.35), root)
bpy.ops.mesh.primitive_cone_add(radius1=0.38, radius2=0.05, depth=2.2, location=(0, 0, -1.0)); flame = bpy.context.object
flame.rotation_euler = (math.pi, 0, 0); put(flame, mat("Flame", FLAME, 0, 0.5, 12.0), root)

# flame flicker
for f in range(1, FRAMES + 1, 3):
    flame.scale = (1 + random.uniform(-.12, .12), 1 + random.uniform(-.12, .12), 1 + random.uniform(-.25, .35)); flame.keyframe_insert("scale", frame=f)

# flight: slow start, accelerate, gentle roll
root.location = (0, 0, 0); root.keyframe_insert("location", frame=1)
for f in range(1, FRAMES + 1, 5):
    t = (f - 1) / (FRAMES - 1); root.location = (0.6 * t * t, 0, 14 * t ** 2.2); root.rotation_euler = (0.05 * t, 0.12 * t, t * math.pi * 0.8)
    root.keyframe_insert("location", frame=f); root.keyframe_insert("rotation_euler", frame=f)

# stars
smat = mat("Star", (1, 1, 1, 1), 0, 0.5, 8.0)
for _ in range(260):
    p = Vector((random.uniform(-1, 1), random.uniform(0.2, 1), random.uniform(-0.3, 1))).normalized() * random.uniform(55, 80); p.z += 8
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(.05, .16), location=p); bpy.context.object.data.materials.append(smat)

# camera orbit that tracks the rocket
tgt = bpy.data.objects.new("Target", None); sc.collection.objects.link(tgt)
for f in range(1, FRAMES + 1, 5):
    t = (f - 1) / (FRAMES - 1); tgt.location = (0, 0, 2 + 14 * t ** 2.2); tgt.keyframe_insert("location", frame=f)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 40
for f in range(1, FRAMES + 1, 5):
    t = (f - 1) / (FRAMES - 1); a = -1.2 + t * 1.6; z = 3 + 14 * t ** 2.2
    cam.location = (math.cos(a) * 9, math.sin(a) * 9, z); cam.keyframe_insert("location", frame=f)
c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"

# lights
for loc, e, col in [((6, -6, 8), 900, (1, 0.95, 0.9)), ((-7, 4, 4), 400, (0.4, 0.6, 1))]:
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "AREA")); L.data.energy = e; L.data.color = col[:3]; L.data.size = 6; L.location = loc; sc.collection.objects.link(L)
w = bpy.data.worlds.new("W"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.006, 0.014, 1); sc.world = w

# render settings
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try: sc.render.engine = eng; break
    except TypeError: continue
try: sc.eevee.use_bloom = True
except Exception: pass
sc.view_settings.view_transform = "Standard" if "Standard" in [e.identifier for e in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else sc.view_settings.view_transform
sc.render.image_settings.file_format = "FFMPEG"; sc.render.ffmpeg.format = "MPEG4"; sc.render.ffmpeg.codec = "H264"; sc.render.ffmpeg.constant_rate_factor = "MEDIUM"
sc.render.filepath = os.path.join(OUT, "rocket_flow.mp4")

# export model for 3D web viewers, then render the video
bpy.ops.object.select_all(action="DESELECT"); root.select_set(True)
for ch in root.children: ch.select_set(True)
try: bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "rocket.glb"), export_format="GLB", use_selection=True)
except Exception as e: print("GLB export skipped:", e)
bpy.ops.render.render(animation=True)
print("Done ->", OUT)

import bpy, math, json, os
from mathutils import Vector
OUT='/private/tmp/santa-cruz-assets-v2'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
# All modelling dimensions below are expressed in Three.js coordinates: Y up, -Z forward.
def cv(p): return Vector((p[0],-p[2],p[1]))
def mat(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
M={
 'galvanized':mat('galvanized',(.40,.46,.45),.48,.72),'paint':mat('faded marine gray',(.52,.59,.57),.66,.22),'edges':mat('dark steel',(.17,.21,.22),.46,.68),
 'ochre':mat('lifting block yellow',(.72,.43,.10),.58,.18),'bolt':mat('zinc hardware',(.58,.63,.62),.31,.86),'black':mat('rubber charcoal',(.025,.036,.040),.8),
 'cable':mat('steel cable',(.16,.20,.21),.42,.85),'concrete':mat('concrete plinth',(.43,.45,.40),.98),'rust':mat('oxide patina',(.30,.14,.065),.97),
 'orange':mat('orange waterproof bibs',(.56,.22,.075),.71),'orangeShade':mat('orange garment seams',(.31,.10,.035),.78),'navy':mat('navy work shirt',(.065,.11,.16),.98),
 'navyLight':mat('shirt cloth highlights',(.10,.16,.21),.98),'skin':mat('warm skin',(.52,.33,.225),.78),'skinShade':mat('skin shading',(.40,.225,.15),.85),
 'lip':mat('lips',(.36,.20,.15),.85),'eye':mat('eyes off white',(.62,.59,.51),.35),'pupil':mat('iris brown',(.06,.045,.025),.3),
 'cap':mat('faded canvas cap',(.42,.40,.28),.95),'boot':mat('rubber work boots',(.13,.17,.13),.79),'reflect':mat('muted reflective tape',(.68,.68,.45),.53,.15)
}
parts={}
origins={'davitBase':(0,0,0),'davitSlew':(0,.64,0),'hook':(0,0,0),'drum':(0,0,0),'workerBody':(0,0,0),'workerHead':(0,1.545,0),'workerArmL':(-.205,1.435,0),'workerArmR':(.205,1.435,0)}
def own(o,key,ma,name):
 o.name=name;o.data.materials.append(M[ma]);o['part']=key;parts.setdefault(key,[]).append(o);return o

def bevel(o,r=.02,seg=3):
 if r:
  b=o.modifiers.new('Rounded worked edges','BEVEL');b.width=r;b.segments=seg
  w=o.modifiers.new('Weighted edge normals','WEIGHTED_NORMAL');w.keep_sharp=True;w.weight=40
 return o

def box(key,ma,p,d,name,r=.015,rot=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=cv(p));o=bpy.context.object;o.dimensions=(d[0],d[2],d[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if rot: o.rotation_euler=rot
 own(o,key,ma,name);bevel(o,min(r,min(d)*.4));return o

def uvball(key,ma,p,scale,name,segments=16,rings=10):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=cv(p));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return own(o,key,ma,name)

def rod(key,ma,a,b,r1,r2=None,name='rod',verts=12,bevelr=0):
 a,b=cv(a),cv(b);bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r1 if r2 is None else r2,depth=(b-a).length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 own(o,key,ma,name);bevel(o,bevelr,2);return o

def beam(key,ma,a,b,w,d,name):
 a,b=cv(a),cv(b);bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.dimensions=(w,d,(b-a).length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();own(o,key,ma,name);bevel(o,.012,3);return o

def curve(key,ma,ps,r,name,seg=4):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=4;cu.bevel_depth=r;cu.bevel_resolution=seg;sp=cu.splines.new('POLY');sp.points.add(len(ps)-1)
 for pt,p in zip(sp.points,ps):pt.co=(*cv(p),1)
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;own(o,key,ma,name)
 for f in o.data.polygons:f.use_smooth=True
 o.select_set(False);return o

def ring(key,ma,center,r,tube,name,axis='z',n=32):
 x,y,z=center;ps=[]
 for i in range(n+1):
  a=i/n*2*math.pi
  ps.append((x+r*math.cos(a),y+r*math.sin(a),z) if axis=='z' else (x+r*math.cos(a),y,z+r*math.sin(a)))
 return curve(key,ma,ps,tube,name,2)

def loft(key,ma,rings,name,n=16):
 vs=[];faces=[]
 for x,y,z,rx,rz in rings:
  for i in range(n):
   a=2*math.pi*i/n;vs.append(tuple(cv((x+rx*math.cos(a),y,z+rz*math.sin(a)))))
 for j in range(len(rings)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 faces.append(tuple(reversed(range(n))));faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);own(o,key,ma,name)
 for f in me.polygons:f.use_smooth=True
 return o

# Davit: socket foundation, rotating steel column, triangulated jib and actual winding gear.
box('davitBase','concrete',(0,.12,0),(.92,.24,.84),'cast concrete mounting plinth',.035)
box('davitBase','edges',(0,.278,0),(.71,.07,.65),'anchor sole plate',.018)
for x in [-.265,.265]:
 for z in [-.23,.23]:
  rod('davitBase','bolt',(x,.31,z),(x,.365,z),.035,name='hex foundation nut',verts=6,bevelr=.004)
  rod('davitBase','bolt',(x,.34,z),(x,.40,z),.016,name='exposed anchor stud',verts=8)
rod('davitBase','galvanized',(0,.315,0),(0,.73,0),.19,.18,'fixed pedestal socket',24,.014)
ring('davitBase','bolt',(0,.66,0),.191,.018,'swivel thrust bearing',axis='y')
rod('davitSlew','paint',(0,.63,0),(0,4.47,0),.125,.106,'continuous vertical steel mast',20,.01)
rod('davitSlew','edges',(0,.73,0),(0,.97,0),.145,.145,'lower swivel collar',20,.008)
rod('davitSlew','edges',(0,2.73,0),(0,2.90,0),.144,.144,'boom mast collar',20,.008)
# Jib is a twin-web fabricated beam, its geometry can be read clearly from either side.
beam('davitSlew','paint',(.06,2.84,0),(3.72,4.03,0),.16,.20,'main inclined load bearing jib')
beam('davitSlew','paint',(.08,3.43,0),(3.67,4.16,0),.095,.115,'upper truss chord')
for t in [.12,.34,.56,.78]:
 a=(.08+3.59*t,2.84+1.19*t,0);b=(.08+3.59*(t+.16),3.43+.73*(t+.16),0)
 beam('davitSlew','galvanized',a,b,.047,.07,'diagonal jib web brace')
rod('davitSlew','cable',(.015,4.43,0),(3.62,4.16,0),.012,name='tensioned upper stay wire',verts=8)
box('davitSlew','edges',(.25,2.90,0),(.38,.32,.29),'boom heel pivot plates',.025)
rod('davitSlew','bolt',(.26,2.94,-.19),(.26,2.94,.19),.044,name='boom hinge pin',verts=14,bevelr=.006)
for z in [-.175,.175]:
 box('davitSlew','paint',(3.72,4.035,z),(.28,.45,.042),'nose sheave cheek plate',.055)
rod('davitSlew','edges',(3.70,4.04,-.15),(3.70,4.04,.15),.15,name='nose cable sheave',verts=28,bevelr=.007)
for z in [-.09,.09]:ring('davitSlew','cable',(3.70,4.04,z),.148,.013,'wire in sheave groove')
rod('davitSlew','bolt',(3.70,4.04,-.22),(3.70,4.04,.22),.035,name='sheave axle with retainers',verts=12)
# Gearbox, spindle, handbrake, motor and cable turns on the drum.
box('davitSlew','paint',(-.13,1.25,.24),(.43,.30,.27),'sealed winch reduction gearbox',.047)
rod('davitSlew','edges',(-.13,1.27,-.40),(-.13,1.27,.23),.065,name='drum spindle',verts=14)
rod('davitSlew','edges',(-.13,1.27,-.35),(-.13,1.27,-.07),.13,name='winding drum',verts=22,bevelr=.007)
for z in [-.35,-.06]:rod('davitSlew','ochre',(-.13,1.27,z-.02),(-.13,1.27,z+.02),.175,name='winch drum flange',verts=28,bevelr=.006)
for i in range(12):ring('davitSlew','cable',(-.13,1.27,-.33+i*.021),.137,.008,'individual cable wrap')
curve('davitSlew','cable',[(-.04,1.40,-.18),(.065,2.0,-.14),(.10,2.84,-.10),(3.62,3.94,-.10)],.009,'winch lead to nose sheave',2)
rod('davitSlew','edges',(-.13,1.27,.385),(-.13,1.27,.48),.039,name='handwheel hub',verts=10)
ring('davitSlew','edges',(-.13,1.27,.48),.23,.015,'manual brake handwheel')
for i in range(4):
 a=i*math.pi/2;rod('davitSlew','edges',(-.13,1.27,.48),(-.13+math.cos(a)*.225,1.27+math.sin(a)*.225,.48),.01,name='handwheel spoke',verts=6)
box('davitSlew','ochre',(-.19,1.81,.17),(.25,.36,.13),'weatherproof hoist control enclosure',.025)
box('davitSlew','black',(-.19,1.81,.245),(.17,.25,.018),'control switch face',.007)
rod('davitSlew','orange',(-.19,1.87,.253),(-.19,1.87,.284),.043,name='emergency stop mushroom button',verts=14)
rod('davitSlew','boot',(-.19,1.75,.253),(-.19,1.75,.276),.021,name='lowering pushbutton',verts=12)
# Dynamic lifting block is modeled at a zero pivot; API places it under the sheave.
box('hook','ochre',(0,-.02,0),(.28,.31,.18),'bevelled twin reeved lifting block',.055)
rod('hook','edges',(0,-.03,-.12),(0,-.03,.12),.082,name='lifting block pulley axle',verts=20,bevelr=.008)
for z in [-.126,.126]:rod('hook','bolt',(0,-.03,z-.01),(0,-.03,z+.01),.034,name='block axle nut',verts=6,bevelr=.004)
rod('hook','bolt',(0,-.17,0),(0,-.25,0),.039,.034,'forged swivelling hook neck',12)
# J-shaped forged hook, gap on upper right, with a slim sprung safety latch.
hp=[(0,-.24,0),(-.085,-.28,0),(-.11,-.36,0),(-.085,-.44,0),(-.005,-.47,0),(.075,-.44,0),(.095,-.37,0),(.065,-.335,0)]
curve('hook','bolt',hp,.026,'open forged load hook',3)
rod('hook','edges',(.064,-.336,0),(.007,-.275,0),.008,name='hook spring safety latch',verts=8)

# A generic dock worker, not a depiction or name of any actual staff member.
# Deliberately human proportions: adult height 1.79m, jaw, ears, hands, boots and articulated shoulders.
for s in [-1,1]:
 x=s*.13
 box('workerBody','black',(x,.025,-.055),(.16,.047,.31),'treaded boot sole',.021)
 box('workerBody','boot',(x,.103,-.063),(.147,.155,.29),'rounded rubber work boot',.045)
 loft('workerBody','boot',[(x,.12,.01,.077,.083),(x,.28,.018,.074,.075),(x,.33,.018,.077,.077)],'boot shaft cuff')
 ring('workerBody','edges',(x,.317,.018),.07,.008,'boot top seam',axis='y',n=18)
 loft('workerBody','orange',[(x,.28,.015,.074,.08),(x,.46,.023,.082,.088),(x+s*.005,.57,.018,.086,.086),(x,.70,.005,.092,.096),(x*.78,.96,0,.107,.112)],'shaped waterproof trouser leg',18)
 curve('workerBody','orangeShade',[(x+s*.074,.34,.02),(x+s*.085,.57,.01),(x+s*.093,.83,0)],.0035,'trouser side seam',1)
 # Knee wear patches are shallow, contoured ellipsoids rather than flat squares.
 uvball('workerBody','orangeShade',(x,.545,-.068),(.062,.091,.020),'reinforced knee patch',12,8)
loft('workerBody','navy',[(0,.89,0,.151,.104),(0,1.08,0,.168,.11),(0,1.29,0,.196,.115),(0,1.43,0,.205,.112),(0,1.487,0,.157,.092)],'tailored work shirt torso',24)
loft('workerBody','orange',[(0,.88,-.007,.153,.108),(0,1.015,-.007,.157,.106),(0,1.17,-.016,.15,.100),(0,1.295,-.021,.125,.093)],'shaped waterproof bib front',20)
box('workerBody','orangeShade',(0,1.17,-.12),(.165,.145,.022),'sewn chest tool pocket',.018)
box('workerBody','orange',(0,1.189,-.135),(.151,.105,.008),'chest pocket face',.008)
for s in [-1,1]:
 curve('workerBody','orange',[(s*.115,1.25,-.10),(s*.142,1.40,-.09),(s*.148,1.478,-.045),(s*.135,1.475,.065),(s*.12,1.13,.105)],.022,'rubber overall shoulder strap',2)
 box('workerBody','edges',(s*.125,1.34,-.115),(.049,.056,.021),'adjustable bib strap buckle',.006)
 box('workerBody','reflect',(s*.122,1.345,-.128),(.031,.021,.007),'buckle insert',.003)
# Split collar and zipper protect the neck.
rod('workerBody','skin',(0,1.445,0),(0,1.605,0),.056,.053,'neck',18)
for s in [-1,1]:
 o=box('workerBody','navyLight',(s*.049,1.491,-.053),(.087,.08,.025),'folded shirt collar',.009);o.rotation_euler[1]=s*.3
curve('workerBody','reflect',[(0,1.365,-.119),(0,1.464,-.09)],.003,'shirt zipper',1)
# Head rings form a cheek/jaw silhouette rather than a sphere.
loft('workerHead','skin',[(0,1.553,-.009,.039,.051),(0,1.572,-.011,.062,.066),(0,1.617,-.008,.079,.077),(0,1.677,0,.085,.084),(0,1.734,.006,.081,.079),(0,1.776,.008,.060,.064),(0,1.79,.01,.023,.030)],'sculpted adult head',24)
for s in [-1,1]:
 uvball('workerHead','skin',(s*.084,1.668,.005),(.018,.033,.018),'ear',12,8)
 uvball('workerHead','skinShade',(s*.094,1.666,-.004),(.008,.017,.007),'ear concha',10,7)
 uvball('workerHead','skinShade',(s*.033,1.692,-.071),(.029,.016,.014),'brow orbital rim',12,8)
 uvball('workerHead','eye',(s*.032,1.682,-.083),(.018,.008,.005),'small inset eye',12,6)
 uvball('workerHead','pupil',(s*.032,1.682,-.088),(.005,.005,.002),'brown iris',10,6)
 curve('workerHead','skinShade',[(s*.011,1.707,-.077),(s*.033,1.712,-.08),(s*.054,1.707,-.075)],.004,'eyebrow',1)
# Nose bridge, tip and nostril wings.
uvball('workerHead','skin',(0,1.668,-.085),(.015,.033,.018),'nose bridge',12,8)
uvball('workerHead','skin',(0,1.650,-.101),(.020,.014,.018),'nose tip',12,8)
for s in [-1,1]:uvball('workerHead','skinShade',(s*.013,1.641,-.100),(.006,.004,.005),'nostril shadow',8,6)
curve('workerHead','lip',[(-.026,1.620,-.077),(-.010,1.622,-.084),(0,1.619,-.086),(.012,1.622,-.084),(.026,1.620,-.077)],.0035,'natural closed mouth',2)
uvball('workerHead','skin',(0,1.588,-.062),(.039,.018,.022),'chin',14,8)
# Proper six-panel cap crown and short curved brim.
uvball('workerHead','cap',(0,1.759,.012),(.091,.055,.089),'canvas cap crown',20,12)
uvball('workerHead','cap',(0,1.749,-.077),(.086,.009,.073),'rounded cap visor',20,8)
curve('workerHead','orangeShade',[(-.071,1.755,-.028),(0,1.804,.007),(.071,1.755,-.028)],.002,'cap seam',1)
uvball('workerHead','cap',(0,1.810,.009),(.011,.006,.011),'cap top button',10,6)
# Separate arm pivots allow idle gestures, winding and a visible wave.
for s,key in [(-1,'workerArmL'),(1,'workerArmR')]:
 sh=(s*.205,1.435,0);el=(s*.274,1.175,-.025);wr=(s*.302,1.005,-.078)
 uvball(key,'navy',sh,(.083,.091,.085),'shirt shoulder',16,10)
 rod(key,'navy',sh,el,.075,.060,'upper sleeve',16)
 uvball(key,'navyLight',el,(.062,.062,.062),'elbow cloth folds',14,9)
 rod(key,'navy',el,wr,.058,.044,'rolled lower sleeve',16)
 rod(key,'navyLight',(s*.298,1.039,-.069),(s*.309,.997,-.083),.046,.046,'rolled shirt cuff',16)
 rod(key,'skin',(s*.303,1.007,-.078),(s*.313,.951,-.094),.035,.030,'visible wrist',12)
 uvball(key,'skin',(s*.313,.928,-.098),(.037,.056,.024),'anatomical palm',14,9)
 for j in range(4):
  xx=s*.313+(j-1.5)*.017;yy=.89-(.008 if j in (1,2) else 0)
  rod(key,'skin',(xx,.921,-.100),(xx,yy,-.111),.008,.006,'individual bent work finger',8)
  uvball(key,'skin',(xx,yy,-.11),(.006,.009,.007),'rounded fingertip',8,6)
 rod(key,'skin',(s*.284,.945,-.098),(s*.270,.915,-.117),.012,.009,'opposed thumb',10)
# Utility belt clip and gloves tucked at the hip.
box('workerBody','edges',(.164,.977,-.019),(.034,.10,.071),'work belt tool clip',.009)
box('workerBody','cap',(.185,.927,-.023),(.041,.14,.077),'folded canvas work gloves',.017)

# Export mesh groups by material. This also bakes Blender bevel and normal modifiers.
deps=bpy.context.evaluated_depsgraph_get();data={'generator':'Blender 5.0.1, bevelled authored meshes','materials':{},'parts':{}}
for ma in M.values():
 bs=ma.node_tree.nodes.get('Principled BSDF');data['materials'][ma.name]={'color':list(bs.inputs['Base Color'].default_value)[:3],'roughness':bs.inputs['Roughness'].default_value,'metalness':bs.inputs['Metallic'].default_value}
triangles=0
for part,objs in parts.items():
 groups={};origin=cv(origins[part])
 for ob in objs:
  ev=ob.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();normalmat=ev.matrix_world.to_3x3().inverted().transposed()
  for tri in me.loop_triangles:
   name=me.materials[tri.material_index].name;g=groups.setdefault(name,{'p':[],'n':[],'i':[],'_map':{}})
   for li in tri.loops:
    loop=me.loops[li];p=ev.matrix_world@me.vertices[loop.vertex_index].co-origin;n=normalmat@me.corner_normals[li].vector;n.normalize()
    vals=tuple(round(x,5) for x in (p.x,p.z,-p.y,n.x,n.z,-n.y))
    if vals not in g['_map']:
     g['_map'][vals]=len(g['p'])//3;g['p'].extend(vals[:3]);g['n'].extend(vals[3:])
    g['i'].append(g['_map'][vals])
   triangles+=1
  ev.to_mesh_clear()
 for g in groups.values():del g['_map']
 data['parts'][part]=groups
with open(OUT+'/harbor-meshes.js','w')as f:f.write('export const HARBOR_MESHES='+json.dumps(data,separators=(',',':'))+';\n')
with open(OUT+'/mesh-stats.json','w')as f:json.dump({'triangles':triangles,'parts':{k:sum(len(g['i'])//3 for g in v.values()) for k,v in data['parts'].items()},'runtimeMeshBytes':os.path.getsize(OUT+'/harbor-meshes.js')},f,indent=2)
# Also deliver a portable GLB and native authoring project for actual asset reuse.
bpy.ops.object.select_all(action='DESELECT')
for objs in parts.values():
 for o in objs:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/harbor-assets.glb',export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/harbor-assets.blend')
# Studio proof: davit and separate full-size worker, with accurate human scale.
for o in parts['hook']:o.location+=cv((3.7,1.2,0))
for part in ['workerBody','workerHead','workerArmL','workerArmR']:
 for o in parts[part]:o.location+=cv((1.4,0,.95))
for z in [-.075,.075]:rod('proof','cable',(3.7,3.97,z),(3.7,1.35,z),.011,name='proof hoisting cable',verts=8)
box('proof','concrete',(1.2,-.06,0),(6,.12,4),'studio floor',.01)
world=bpy.data.worlds.new('coastal sky') if not bpy.data.worlds else bpy.data.worlds[0];bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.49,.53,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
for name,p,power,size in [('key',(0,8,-6),1700,6),('fill',(5,5,3),1300,5)]:
 bpy.ops.object.light_add(type='AREA',location=cv(p));l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(cv((1.5,2,0))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=cv((8.6,5.1,-9.5)));camera=bpy.context.object;camera.rotation_euler=(cv((1.5,2.1,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.2;bpy.context.scene.camera=camera
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1400;sc.render.resolution_y=1100;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.filepath=OUT+'/harbor-proof.png';sc.view_settings.view_transform='AgX';bpy.ops.render.render(write_still=True)
# Worker closeup to inspect anatomy, clothing and face.
camera.location=cv((2.4,1.7,-1.3));camera.rotation_euler=(cv((1.4,1.0,.95))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=2.12;sc.render.resolution_x=1000;sc.render.resolution_y=1100;sc.render.filepath=OUT+'/worker-proof.png';bpy.ops.render.render(write_still=True)
print('EXPORT_COMPLETE',triangles,os.path.getsize(OUT+'/harbor-meshes.js'))

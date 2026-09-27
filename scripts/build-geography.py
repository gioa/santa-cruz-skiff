# coding: utf-8
"""Convert the downloaded OSM extract to a compact, attributed WGS84 game map."""
import json,math,argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--coast',type=Path,required=True);parser.add_argument('--pier',type=Path,required=True);args=parser.parse_args();a=json.loads(args.coast.read_text());b=json.loads(args.pier.read_text())
def join(lines):
 lines=[list(x) for x in lines if x];chains=[]
 while lines:
  chain=lines.pop(0);changed=True
  while changed:
   changed=False
   for i,line in enumerate(lines):
    if chain[-1]==line[0]:chain+=line[1:]
    elif chain[-1]==line[-1]:chain+=line[-2::-1]
    elif chain[0]==line[-1]:chain=line[:-1]+chain
    elif chain[0]==line[0]:chain=line[:0:-1]+chain
    else:continue
    lines.pop(i);changed=True;break
  chains.append(chain)
 return chains
pts=lambda g:[[p['lon'],p['lat']] for p in g]
coast=join([pts(e['geometry']) for e in a['elements'] if e.get('tags',{}).get('natural')=='coastline'])
relation=next(e for e in b['elements'] if e.get('id')==7063040)
pier=join([pts(m['geometry']) for m in relation['members'] if m['role']=='outer'])
buildings=[]
for e in a['elements']:
 t=e.get('tags',{})
 if 'building' not in t:continue
 g=pts(e['geometry']);lat=sum(p[1] for p in g)/len(g);lon=sum(p[0] for p in g)/len(g)
 if abs(lat-36.96056)>.025 or abs(lon+122.0207)>.04:continue
 try:height=float(t.get('height',float(t.get('building:levels',1))*3.3))
 except:height=4.2
 buildings.append({'id':e['id'],'name':t.get('name',''),'height':round(height,1),'outline':g})
data={'source':'© OpenStreetMap contributors','license':'ODbL 1.0','url':'https://www.openstreetmap.org/copyright','observedAt':a.get('osm3s',{}).get('timestamp_osm_base'),'rental':{'lat':36.9605644,'lon':-122.0207135,'osmNode':418204218,'name':'Santa Cruz Boat Rentals'},'pierOsmRelation':7063040,'axisBearingDegrees':134,'coast':coast,'pier':pier,'roads':[pts(e['geometry']) for e in b['elements'] if e.get('type')=='way' and e.get('tags',{}).get('name')=='Municipal Wharf' and 'highway' in e.get('tags',{})],'buildings':buildings,'notes':'Horizontal geometry is geographic. Building heights are OSM values where present; otherwise visual estimates. Not a navigation chart.'}
(root/'dist/data/geography.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('coast chains',len(coast),'pier rings',len(pier),'buildings',len(buildings),'bytes',(root/'dist/data/geography.json').stat().st_size)

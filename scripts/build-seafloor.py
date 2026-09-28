#!/usr/bin/env python3
"""Refresh the small categorical Santa Cruz seabed extract (rasterio/pyproj/pyshp).
USGS interpreted habitats are historical geological evidence, not live kelp or
fish surveys. Keep unsurveyed cells unknown; never extend nearest fishing spots.
"""
import hashlib,json,tempfile,zipfile
from pathlib import Path
from urllib.request import Request,urlopen
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject,Resampling,transform_geom
import shapefile

ROOT=Path(__file__).resolve().parent.parent
BASE='https://cmgds.marine.usgs.gov/data/csmp/OffshoreSantaCruz/'
CLASSES={'0':{'kind':'unknown','label':'底质资料空缺'},'1':{'kind':'sand','label':'沙底'},'2':{'kind':'mud','label':'细沙／泥底'},'3':{'kind':'mixed','label':'砂砾与混合硬底'},'4':{'kind':'reef','label':'裸岩／巨石底'},'5':{'kind':'artificial','label':'人工结构'}}

def run(folder):
 source=[]
 for name in ['SeafloorCharacter_OffshoreSantaCruz','Habitat_OffshoreSantaCruz']:
  url=BASE+'data/'+name+'.zip';archive=folder/(name+'.zip')
  if not archive.exists():archive.write_bytes(urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':BASE}),timeout=60).read())
  source.append({'url':url,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()})
  with zipfile.ZipFile(archive) as z:z.extractall(folder/name)
 b=json.loads((ROOT/'dist/data/bathymetry.json').read_text());w,h=512,384
 transform=from_bounds(b['west'],b['south'],b['east'],b['north'],w,h)
 char=np.full((h,w),-128,dtype=np.int16)
 with rasterio.open(folder/'SeafloorCharacter_OffshoreSantaCruz/SeafloorCharacter_OffshoreSantaCruz.tif') as r:
  reproject(source=rasterio.band(r,1),destination=char,src_transform=r.transform,src_crs=r.crs,dst_transform=transform,dst_crs='EPSG:4326',src_nodata=r.nodata,dst_nodata=-128,resampling=Resampling.nearest)
  raster_crs=str(r.crs)
 cells=np.zeros((h,w),dtype=np.uint8)
 for old,new in [(1,2),(2,3),(3,4),(4,3),(5,5)]:cells[char==old]=new
 shp=folder/'Habitat_OffshoreSantaCruz/Habitat_OffshoreSantaCruz/Habitat_OffshoreSantaCruz'
 records=shapefile.Reader(str(shp),encoding='latin1');polygons=[]
 for item in records.iterShapeRecords():
  a=item.record.as_dict();kind=a['Hab_Type'].lower();ind=a['Ind'].lower();sed=a['Sed'].lower()
  value=5 if kind in ['jetty/riprap','pipeline'] else 4 if ind=='hard' else 3 if ind=='mixed habitat' or 'gravel' in sed else 2 if 'mud' in sed else 1
  polygons.append((transform_geom(shp.with_suffix('.prj').read_text(),'EPSG:4326',item.shape.__geo_interface__),value))
 habitats=rasterize(polygons,out_shape=(h,w),transform=transform,fill=0,dtype='uint8')
 cells[habitats>0]=habitats[habitats>0]
 # The raster's directly classified rocky/artificial cells preserve narrow
 # outcrops that generalized habitat polygons may smooth out.
 cells[char==3]=4;cells[char==5]=5
 result={'width':w,'height':h,'west':b['west'],'east':b['east'],'south':b['south'],'north':b['north'],'rowOrder':'north-to-south','cellSampling':'nearest categorical cell, no interpolation or gap filling','cellSizeMetersApprox':20,'sourceResolutionMeters':2,'sourceRasterCRS':raster_crs,'source':'USGS California State Waters Map Series — Offshore Santa Cruz, DS 781 / OFR 2016-1024','sourceUrl':'https://doi.org/10.5066/F7TM785G','surveyPeriod':'2006–2010 source inputs; 2014 habitat interpretation / 2016 map publication','explanation':'Historical interpreted substrate; no live kelp classification. Original unsurveyed nearshore gaps remain unknown.','sources':source,'classes':CLASSES,'rows':[''.join(map(str,row)) for row in cells.tolist()]}
 (ROOT/'dist/data/seafloor.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
 print('class counts',dict(zip(*np.unique(cells,return_counts=True))))
 for lon,lat in [(-122.0198,36.9609),(-122.0233,36.9595),(-122.0288,36.9505),(-122.0118,36.9585),(-121.9845,36.9515)]:
  row,col=rasterio.transform.rowcol(transform,lon,lat);print(lon,lat,CLASSES[str(cells[row,col])])
if __name__=='__main__':
 import sys
 if len(sys.argv)>1:
  folder=Path(sys.argv[1]);folder.mkdir(parents=True,exist_ok=True);run(folder)
 else:
  with tempfile.TemporaryDirectory() as path:run(Path(path))

# coding: utf-8
"""Refresh attributed public NOAA observations. Keep dated last-known data on failure."""
import argparse,json,urllib.request,datetime,math
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--offline',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'dist/data/marine.json';now=datetime.datetime.now(datetime.timezone.utc)
old=json.loads(out.read_text()) if out.exists() else {}
result={**old,'generatedAt':now.isoformat(),'errors':[],'note':'Offshore regional observations are not a measurement or safety forecast at the skiff. Tide values are predictions, not live water-level observations.'}
def load(url,filename):
 if args.offline:return (args.offline/filename).read_text()
 req=urllib.request.Request(url,headers={'User-Agent':'SantaCruzSkiffGame/2.0 public NOAA marine observation display'})
 with urllib.request.urlopen(req,timeout=20) as r:return r.read().decode()
def station(id,name,lat,lon):
 try:
  raw=load(f'https://www.ndbc.noaa.gov/data/realtime2/{id}.txt',id+'.txt');lines=raw.strip().splitlines();names=lines[0].lstrip('#').split();rows=[]
  for line in lines[2:80]:
   vals=line.split();row=dict(zip(names,vals));t=datetime.datetime(*map(int,vals[:5]),tzinfo=datetime.timezone.utc).isoformat();rows.append((t,row))
  values={}
  for col in ['WDIR','WSPD','GST','WVHT','DPD','MWD','WTMP','ATMP']:
   for t,row in rows:
    v=row.get(col,'MM')
    if v!='MM':values[col]={'value':float(v),'observedAt':t};break
  distance=6371*2*math.asin(math.sqrt(math.sin(math.radians(lat-36.9605644)/2)**2+math.cos(math.radians(lat))*math.cos(math.radians(36.9605644))*math.sin(math.radians(lon+122.0207135)/2)**2))
  result[id]={'id':id,'name':name,'lat':lat,'lon':lon,'distanceKm':round(distance,1),'url':f'https://www.ndbc.noaa.gov/station_page.php?station={id}','values':values}
 except Exception as e:result['errors'].append(f'{id}: {type(e).__name__}')
station('46236','Monterey Canyon Outer',36.759,-121.950)
station('46042','Monterey offshore',36.787,-122.408)
start=(now-datetime.timedelta(days=1)).strftime('%Y%m%d');end=(now+datetime.timedelta(days=2)).strftime('%Y%m%d')
url=f'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=SantaCruzSkiff&begin_date={start}&end_date={end}&datum=MLLW&station=9413745&time_zone=gmt&units=metric&interval=hilo&format=json'
try:
 tide=json.loads(load(url,'tide-santa-cruz.txt'))
 if 'predictions' not in tide:raise ValueError('No predictions')
 result['tide']={'station':'9413745','name':'Santa Cruz, Monterey Bay','datum':'MLLW','type':'predicted high/low','timezone':'UTC','url':url,'predictions':tide['predictions']}
except Exception as e:result['errors'].append('tide: '+type(e).__name__)
out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));print('Marine snapshot:',out,'failures:',result['errors'])

"""NOAA HF-radar regional surface vector; no inferred tidal/deep current."""
import csv,io,math,datetime,urllib.parse
SOURCE='https://coastwatch.pfeg.noaa.gov/erddap/griddap/ucsdHfrW2'
QUERY=','.join(v+'[(last-11):1:(last)][(36.85):1:(36.97)][(-122.10):1:(-121.95)]' for v in ['water_u','water_v'])
URL=SOURCE+'.csv?'+urllib.parse.quote(QUERY,safe=',():')
def parse_surface_current(raw,now):
 candidates=[]
 for row in list(csv.DictReader(io.StringIO(raw)))[1:]:
  try:
   u,v,lat,lon=(float(row[k]) for k in ['water_u','water_v','latitude','longitude'])
   observed=datetime.datetime.fromisoformat(row['time'].replace('Z','+00:00'))
   if not all(math.isfinite(x) for x in [u,v,lat,lon]) or math.hypot(u,v)>2.5 or observed>now:continue
   distance=111.2*math.hypot(lat-36.94,(lon+122.02)*math.cos(math.radians(lat)))
   if distance>15:continue
   candidates.append((observed,-distance,u,v,lat,lon))
  except (ValueError,KeyError):continue
 if not candidates:raise ValueError('No valid regional surface vector')
 t,negative_distance,u,v,lat,lon=max(candidates)
 return {'eastMps':u,'northMps':v,'observedAt':t.isoformat(),'lat':lat,'lon':lon,'distanceKm':round(-negative_distance,2),'source':'NOAA HF Radar US West Coast 2 km','url':SOURCE+'.graph','method':'Newest valid hour, nearest cell to Santa Cruz nearshore; uniform-depth regional approximation.'}

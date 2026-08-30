from datetime import date
EPOCH=1724221
CUM=[0,365,730,1096]   # day-offsets of years 1..4 within a 4-yr cycle (yr3 is leap)

def eth_to_jdn(y,m,d): return EPOCH+365*(y-1)+y//4+30*(m-1)+(d-1)
def greg_to_jdn(y,m,d):
    a=(14-m)//12; yy=y+4800-a; mm=m+12*a-3
    return d+(153*mm+2)//5+365*yy+yy//4-yy//100+yy//400-32045
def jdn_to_greg(j):
    a=j+32044; b=(4*a+3)//146097; c=a-146097*b//4
    dd=(4*c+3)//1461; e=c-1461*dd//4; m=(5*e+2)//153
    return (100*b+dd-4800+m//10,m+3-12*(m//10),e-(153*m+2)//5+1)
def ref_e2g(y,m,d): return jdn_to_greg(eth_to_jdn(y,m,d))
def ref_g2e(gy,gm,gd):
    n=greg_to_jdn(gy,gm,gd)-EPOCH
    c,r=divmod(n,1461)
    idx=max(i for i in range(4) if CUM[i]<=r)
    doy=r-CUM[idx]
    return (4*c+idx+1, doy//30+1, doy%30+1)

ANCHORS=[((2000,1,1),(2007,9,12)),((2018,1,1),(2025,9,11)),((2003,13,6),(2011,9,11)),
         ((2004,13,5),(2012,9,10)),((2016,1,1),(2023,9,12)),((2017,1,1),(2024,9,11))]
print("=== REFERENCE v3 ===")
allok=True
for eth,greg in ANCHORS:
    g=ref_e2g(*eth); e=ref_g2e(*greg); s=(g==greg and e==eth); allok&=s
    print(f"  {'OK ' if s else 'FAIL'} {eth} <-> {greg}")
bad=0; d=date(1900,1,1)
while d<=date(2100,12,31):
    y,m,dd=ref_g2e(d.year,d.month,d.day)
    if ref_e2g(y,m,dd)!=(d.year,d.month,d.day): bad+=1
    d=date.fromordinal(d.toordinal()+1)
print(f"  anchors_pass={allok}  round-trip 1900-2100 mismatches={bad}\n")

def greg_leap(y): return (y%4==0 and y%100!=0) or y%400==0
def eth_leap(y): return y%4==3
def ei_g2e(gy,gm,gd):
    dt=date(gy,gm,gd); ny=date(gy,9,12 if greg_leap(gy) else 11)
    ey=gy-8 if dt<ny else gy-7
    if dt<ny: ny=date(gy-1,9,12 if greg_leap(gy-1) else 11)
    dd=(dt-ny).days
    if dd<360: return (ey,dd//30+1,dd%30+1)
    p=dd-360; L=6 if eth_leap(ey) else 5
    return (ey,13,p+1) if p<L else (ey,1,p-L+1)

print("=== ETHIO-INTL src/utils/date.ts vs REFERENCE ===")
mism=0;tot=0;ex=[]
d=date(2005,1,1)
while d<=date(2030,12,31):
    tot+=1; r=ref_g2e(d.year,d.month,d.day); g=ei_g2e(d.year,d.month,d.day)
    if g!=r:
        mism+=1
        if len(ex)<6: ex.append((d.isoformat(),g,r))
    d=date.fromordinal(d.toordinal()+1)
print(f"  {mism}/{tot} days disagree ({100*mism/tot:.1f}%)")
for e in ex: print(f"    {e[0]}: ethio-intl={e[1]}  ref={e[2]}")
print()
print("  Spot-check today (2026-08-30):")
print(f"    reference  = {ref_g2e(2026,8,30)}")
print(f"    ethio-intl = {ei_g2e(2026,8,30)}")

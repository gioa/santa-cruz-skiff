# Species mass audit — 2026-09-27

All 13 catchable pixel-edition species now have a taxon-specific published
length–mass curve. Removed the old specimen anchors / universal exponent 2.7.
`fishMassKg` accepts the existing catch ruler in cm and returns whole wet kg;
UI continues to display inches and pounds. Bonito's ruler is fork length (FL);
other species use total length (TL). Never insert inches into a cm equation,
TL into an explicitly FL equation without conversion, or grams as kilograms.

These are representative population predictions. Sex, season, condition,
region and study method vary; they are not exact weights for individual fish.
Sex-specific curves use an arithmetic 50:50 mean (a game assumption). Forage
curves use the arithmetic mean of spring and summer predictions, not a claimed
seasonal calendar model. No invented random obesity factor or record-weight cap.
The legal ruler, spawning ranges and past catches / settled credits are unchanged.
New weight feeds cargo, credits and the existing physical fight model.

## Rockfish report

The old copper model produces 4.03 kg / **8.88 lb at 57 cm (22.4 in)**.
That reproduces the reported weight, but without the catch record we cannot
confirm the user's species or exact unrounded length. The new copper curve
predicts **3.80 kg / 8.38 lb** at 57 cm. At exactly **22 in**, copper is about
**7.87 lb**, vermilion **6.22 lb**. This is not evidence that a wild 8.88 lb
rockfish is impossible. Blue, copper and vermilion cannot share a weight curve.
Blue's playable maximum is 39 cm, so it cannot normally produce a 22 in catch.

## Sources and implementation units

Here L denotes the equation's specified length, W its specified mass. Retain
original coefficients in code so audits do not depend on rounded example fish.

| Species | Equation / measurement | Primary source |
|---|---|---|
| Blue rockfish | W(g)=0.000009774 × TL(mm)^3.09, combined sexes | [2007 California assessment, biological parameters p21, citing Lea et al. 1999](https://www.pcouncil.org/documents/2008/01/the-2007-assessment-of-blue-rockfish-sebastes-mystinus-in-california-january-2008.pdf) |
| Copper rockfish | Female kg=0.0000096 × L(cm)^3.19; male kg=0.0000111 × L(cm)^3.15 | [PFMC 2023 north-of-Point-Conception assessment §2.4.4](https://www.pcouncil.org/documents/2024/03/status-of-copper-rockfish-along-the-u-s-california-coast-north-of-point-conception-in-2023.pdf/) |
| Vermilion rockfish | Female ln(kg)=−11.316+3.112 ln(FL cm); male −10.833+2.968 ln(FL cm), n=267/274 | [Keller et al. 2022 Table 6 p48, vermilion rows, not sunset](https://repository.library.noaa.gov/view/noaa/60776/noaa_60776_DS1.pdf) |
| Lingcod | Female kg=0.000003450 × FL(cm)^3.2364; male 0.000002425 × FL(cm)^3.3367 | [PFMC 2021 southern assessment §2.3.4](https://www.pcouncil.org/documents/2021/12/status-of-lingcod-ophiodon-elongatus-along-the-southern-u-s-west-coast-in-2021-december-2021.pdf/) |
| California halibut | kg=mean(0.00000621,0.00000607) × TL(cm)^3.14 | [CDFW 2024 assessment Table 12](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=229693) |
| Northern anchovy | g=exp(−12.847+0.087 Is) × TL(mm)^3.167 | [Forage-fish length/mass study, 2019 Table 3 GLM](https://repository.library.noaa.gov/view/noaa/54295/noaa_54295_DS1.pdf) |
| Pacific sardine | g=exp(−12.475+0.174 Is) × TL(mm)^3.121 | Same Table 3 |
| Pacific mackerel | g=exp(−12.631+0.083 Is) × TL(mm)^3.165 | Same Table 3 |
| Chinook salmon | g=0.003118 × FL(cm)^3.3641, n=24 | [NOAA 2004 West Coast trawl survey, Table 29 p129](https://repository.library.noaa.gov/view/noaa/3536/noaa_3536_DS1.pdf) |
| White seabass | g=0.000015491 × TL(mm)^2.9216 | [CDFW FMP biology §2.3, Thomas 1968 mature fish](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=34120) |
| Pacific bonito (northern population) | g=0.009376 × FL(cm)^3.08962 | [NOAA Yoshida 1980 Table 23 p35, standardized units from Campbell & Collins 1975](https://swfsc-publications.fisheries.noaa.gov/publications/CR/1980/8094.PDF) |
| White croaker | Female g=0.0109 × TL(cm)^3.0239; male 0.0111 × TL(cm)^3.0114 | [Love et al. 1984, Figures 4–5](https://spo.nmfs.noaa.gov/sites/default/files/pdf-content/1984/821/love.pdf) |
| Pacific sanddab | g=0.005336 × L(cm)^3.1859, n=1514 | NOAA 2004 trawl survey Table 29 |

Is=0 spring, Is=1 summer. All three forage species use identical precision
(grams) for school and ordinary encounters. Previously adult mackerel used
0.6 kg at 31.5 cm while schools used 0.12 kg at 22 cm, causing contradictory
weights at identical lengths. The new 31.5 cm prediction is 0.275 kg / 0.61 lb.

## Conversions and limits

- Vermilion: FL(mm)=8.665+0.946 TL(mm), [Echeverria & Lenarz 1984 Table 3](https://spo.nmfs.noaa.gov/sites/default/files/pdf-content/fish-bull/echeverria.pdf).
  Thus FL(cm)=0.8665+0.946 TL(cm). The mass data span roughly 18–56 cm FL;
  the largest game trophies extrapolate beyond that sample.
- Copper: PFMC §2.4.4 specifies cm, not explicitly TL/FL. Applying displayed
  TL is a documented approximation. Echeverria's copper FL≈0.988 TL shows
  this remaining ambiguity corresponds to about 4% mass, not a factor of two.
- Lingcod: retain the prior explicit TL≈FL approximation based on the
  assessment's similar-length tail-shape discussion. Sanddab's trawl survey
  uses fork or total length as appropriate; use its rounded-tail TL.
- Chinook: convert TL to FL using [Conrad & Gutmann 1996, author-posted NWIFC report](https://www.researchgate.net/publication/325022326_Conversion_Equations_Between_Fork_Length_and_Total_Length_for_Chinook_Salmon_Oncorhynchus_tshawytscha).
  Below 72 cm TL, FL=.957 TL−.979; at/above 72, FL=.969 TL−1.442.
  Published ranges are 37–72 and 72–84 cm TL; the game's >84 cm fish use
  extrapolation. The mass fit has only 24 survey fish, not a comprehensive
  Santa Cruz salmon dataset. This is an explicit limitation, not new certainty.
- White seabass fit is for mature fish; lower-end juveniles are extrapolation.
  At 98.5 cm it gives 8.62 kg, agreeing with the rounded 8.6 kg in the
  [CDFW size/age reference table](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=34151&inline=true).
- Croaker uses the published southern California fit; Monterey sampling in
  the study does not establish an identical local curve.
- Bonito source transcriptions without units disagree. Use NOAA's explicitly
  standardized grams/cm Table 23, visually checked, not assume an unlabelled
  coefficient means kg/cm. It yields 1.66 kg at 50 cm FL.
- Sanddab: avoid the inconsistent decimal/unit transcription in the 2013
  assessment prose; use the directly tabulated NOAA 2004 curve above.

## Validation

Source-table benchmarks for all 13 species; monotonic finite values across
every playable length range; no dependence on spawn bounds or legacy anchors;
same mackerel mass across actual school generation and ordinary encounters;
unknown species cannot silently fall back to invented weights. Existing
halibut/lingcod mass and fight regressions remain in the full test suite.

# Nearshore small fish added on 2026-09-27

The former nine-species roster omitted small sand-bottom fish, forcing ordinary
wharf bait encounters toward predators such as lingcod and halibut. Two locally
documented species fill that missing ecological group. Availability is handled
by the location/depth/presentation model, separately from legal retention.

## White croaker / kingfish — Genyonemus lineatus

[CDFW's 2011 White Croaker report](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=65489)
describes a schooling nearshore fish over soft sand and mud, generally in 3–30 m.
It feeds on small invertebrates, squid and other animals. Fish above 30 cm are
unusual, so the game uses an 18–30 cm catch range, not the documented record.
Its silvery/brassy body, blunt snout, straight tail and dark pectoral-base mark
inform the original pixel sprite. The game's mass reference is 0.19 kg at 25 cm;
this is conservative simulation tuning, not a measured local length-weight fit.

## Pacific sanddab — Citharichthys sordidus

[NOAA's 2013 stock assessment](https://swfsc-publications.fisheries.noaa.gov/publications/CR/2013/2013He.pdf)
places this small left-eyed flatfish broadly along the Pacific coast, commonly
in 35–95 m, with a wider usual range of 18–275 m. It belongs to sandy or muddy
bottom habitat. Those depth ranges should shape probabilities, not create a
strict shallow-water prohibition.

A [federal Pacific coast species account](https://www.govinfo.gov/content/pkg/GOVPUB-I-59dd0cbc69421663f56b750fb49fa0f0/pdf/GOVPUB-I-59dd0cbc69421663f56b750fb49fa0f0.pdf)
describes central/northern California occurrence and skiff hook-and-line fishing.
It reports a 160 g reference at 246 mm; the game uses that reference with its
existing approximate allometric exponent and a conservative 15–28 cm catch
range. This is not a sampled Santa Cruz catch-size distribution. The sprite has
a flat mottled body, two eyes on the eyed side and a nearly square tail, following
[NOAA's identification account](https://repository.library.noaa.gov/view/noaa/44179/noaa_44179_DS1.pdf).

## Local evidence and limits

The [Santa Cruz Wharf account archived for CDFW sampler training](https://filelib.wildlife.ca.gov/FileLib/CRFS/CRFS%20Training%20Materials/Sites/Pier_Info/SCR_piers.pdf)
explicitly describes white croaker and Pacific sanddab among bottom-bait catches
around mid-pier in summer and fall. It is a historical first-hand account, not
a present-day abundance survey. It also distinguishes the tiny speckled sanddab;
the game must not treat every shallow-water sanddab observation as Pacific sanddab.

Both added species have their own low-force fight and hook-hold settings. The
parameters represent modest short movements and ordinary steady retrieval,
without an exhaustion timer. Force, mouth opening, seating chance and loss rates
are game tuning. No measured hooked-force or escape-rate data is claimed.

Retention is separately checked using current rules: white croaker belongs to
the general finfish framework; Pacific sanddab has a distinct no-bag-limit rule
under [14 CCR 28.48](https://govt.westlaw.com/calregs/Document/IB5D385B0014E11EFAF93B42E135FCAF3?contextData=%28sc.Default%29&originationContext=documenttoc&transitionType=CategoryPageItem&viewType=FullText).
These exemptions do not remove marine protected area restrictions.

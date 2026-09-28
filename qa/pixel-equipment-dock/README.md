# Left equipment operation rail (v68)

Map/GPS, compass and sounder shortcuts join helm, rod and trolling motor in the bottom-left equipment rail. The contextual bail button also belongs here. Instrument visibility follows owned + enabled gear; sounder and boat controls require being aboard. Backpack and catch journal stay at the top right. Walking interaction labels avoid the equipment rail.

Portrait uses a vertical rail; short landscape uses two columns outside the helm panel. Overflow remains touch-scrollable on very small screens. The chart shortcut now explicitly calls openMap() rather than passing a DOM click event as its device argument.

Validation: npm run check; all 701 existing tests pass. Browser QA at 390×844 and 844×390: GPS chart, compass and sounder each opened from the rail; helm switching worked; ashore showed only chart + compass; starter profile showed no unowned instrument buttons. Final synthetic offshore fixture had no console errors (an earlier fixture-only missing syncVessel import was corrected). Images: phone.png, landscape.png, ashore.png. Local QA HTML/module removed before publication.

Bow Grade Vault Public Registry PRO

Files:
- index.html
- style.css
- script.js
- public-cards.json

Testing locally:
Use VS Code Live Server or run this inside the folder:
python -m http.server 8000
Then open http://localhost:8000

Important:
The website reads public-cards.json from the same folder as index.html.
If your extension exports public-cards.json, replace this file with your exported file.

This version does not display every card immediately. Visitors search first or click Show all public cards.

Fields supported include:
cardName, category, cardImageUrl, finalGrade, centeringScore, cornersScore, edgesScore, surfaceScore,
howAcquired, selfPulled, acquiredFrom, acquiredDate,
authenticityStatus, verifiedBy, verifiedDate, authenticityNotes,
isSlabbed, slabbedBy, bowCertNumber, slabDate, slabNotes,
currentOwner, currentLocation, isLost, lostNotes, ownerHistory,
pricingUrl, officialInfoUrl, extraReferenceUrl, lastUpdated.

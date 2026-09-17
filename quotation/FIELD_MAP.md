# LUMA quotation highlighted-field inventory

The approved visual source is `quotation/assets/LUMA_ENG_static.pdf`. Coordinates are millimetres from the A4 top-left corner. `B` is the generated text baseline Y coordinate. Every field currently has `source=TBD` and is temporarily editable in the Quotation tab. Pages 2, 3, and 7–10 contain no yellow-highlighted regions.

| Page | Field ID | Label | Example | Erase (x, y, w, h mm) | Text (x, B, max w mm) | Style |
|---:|---|---|---|---|---|---|
| 1 | `clientCompany` | Client Company | NAME COMPANY | 19.93, 141.64, 73.10, 9.70 | 92.80, 149.93, 72.70 | 22 pt bold dark, right-aligned with `/` suffix |
| 1 | `projectLocation` | Project Location | Location | 79.73, 164.92, 25.05, 8.64 | 79.77, 172.16, 25.00 | 20 pt bold gray |
| 1 | `clientTitle` | Contact Title | MR/MRs | 43.39, 183.09, 27.87, 9.52 | 43.40, 191.03, 27.80 | 22 pt gray |
| 1 | `clientFirstName` | Client First Name | XXXXX | 26.63, 192.62, 21.52, 9.52 | 26.59, 200.48, 21.55 | 22 pt bold dark |
| 1 | `clientLastName` | Client Last Name | XXXXXX | 49.57, 192.62, 25.93, 9.52 | 49.71, 200.48, 25.78 | 22 pt bold dark |
| 1 | `clientAddress` | Address | Address | 26.63, 208.14, 13.93, 5.29 | 26.59, 212.30, 54.00 | 12 pt gray |
| 1 | `clientPostalCode` | Postal Code | Postal code | 26.63, 213.25, 22.90, 5.29 | 26.59, 217.45, 22.10 | 12 pt gray, static-style ` -` suffix |
| 1 | `clientCity` | City | City | 49.39, 213.25, 6.88, 5.29 | 49.66, 217.45, 31.00 | 12 pt gray |
| 1 | `clientCountry` | Country | Country | 26.63, 218.55, 13.93, 5.29 | 26.59, 222.60, 54.00 | 12 pt gray |
| 1 | `quotationNumber` | Quotation Number | XXXX | 161.75, 243.42, 17.28, 4.76 | 180.40, 247.12, 17.20 | 11 pt gray, right-aligned; `_ksi1.0` remains static |
| 1 | `quotationDateDay` | Quotation Date — Day | XX | 171.10, 248.88, 4.06, 4.76 | 175.05, 252.59, 4.00 | 11 pt gray, right-aligned |
| 1 | `quotationDateMonth` | Quotation Date — Month | XX | 176.57, 248.88, 4.06, 4.76 | 180.55, 252.59, 4.00 | 11 pt gray, right-aligned |
| 4 | `trackerOfferQuantity` | Tracker Offer Quantity | kWp | 113.59, 40.22, 7.06, 3.88 | 113.56, 43.22, 7.05 | 10 pt black |
| 4 | `trackerPricePerKwWhole` | Tracker Price €/kW — Whole Number | XXX | 133.17, 40.22, 7.06, 3.88 | 140.10, 43.22, 7.00 | 11 pt black, right-aligned |
| 4 | `panelsPerStructure` | Panels per Structure | XX | 66.32, 73.91, 3.88, 4.94 | 70.20, 77.79, 3.85 | 11 pt gray, right-aligned |
| 4 | `structureCount` | Number of Structures | XX | 82.73, 73.91, 3.70, 4.94 | 82.73, 77.79, 3.65 | 11 pt gray |
| 4 | `pileCount` | Number of Piles | XXXX | 47.62, 78.85, 7.58, 4.94 | 47.62, 82.73, 7.50 | 11 pt gray |
| 4 | `moduleCount` | Module Quantity | XXXX | 37.22, 88.72, 7.76, 4.41 | 44.98, 92.25, 7.70 | 11 pt gray, right-aligned |
| 4 | `moduleWidthMm` | Module Width | XXXX | 56.62, 93.49, 7.76, 4.41 | 64.30, 97.01, 7.70 | 11 pt gray, right-aligned |
| 4 | `moduleLengthMm` | Module Length | XXXX | 65.97, 93.49, 7.58, 4.41 | 73.50, 97.01, 7.50 | 11 pt gray, right-aligned |
| 4 | `modulePowerWp` | Module Power | XXX | 48.70, 98.07, 5.95, 4.59 | 54.55, 101.60, 5.60 | 11 pt gray, right-aligned |
| 4 | `trackerLengthM` | Tracker Length | XX | 54.50, 102.83, 3.88, 4.94 | 58.38, 106.72, 3.85 | 11 pt gray, right-aligned |
| 4 | `trackerHeightM` | Height with Flat Panels | 1,50 | 70.38, 107.77, 6.53, 4.94 | 76.91, 111.65, 6.48 | 11 pt gray, right-aligned |
| 4 | `foundationDepthM` | Ramming Depth | 1,50 | 60.50, 112.71, 6.53, 4.94 | 67.03, 116.59, 6.48 | 11 pt gray, right-aligned |
| 4 | `maximumTrackingTilt` | Maximum Tracking Tilt | 60° | 60.85, 117.65, 5.12, 4.76 | 60.85, 121.53, 5.08 | 11 pt gray |
| 4 | `groundClearanceM` | Ground Clearance at 60° | 0,50 | 72.85, 122.41, 6.53, 4.94 | 79.38, 126.29, 6.48 | 11 pt gray, right-aligned |
| 4 | `pitchDistance` | Pitch Distance | XX,XX m | 57.33, 127.35, 14.25, 4.94 | 71.50, 131.23, 14.15 | 11 pt gray, right-aligned with `/` suffix |
| 4 | `safeguardQuantity` | Safeguard Quantity | X | 118.18, 135.11, 2.47, 3.88 | 118.26, 138.11, 2.35 | 10 pt black |
| 4 | `monitoringQuantity` | Monitoring System Quantity | X | 118.18, 169.33, 2.47, 3.88 | 118.26, 172.51, 2.35 | 10 pt black |
| 4 | `commissioningPriceWhole` | Commissioning Price — Whole Number | XXXX | 130.88, 240.77, 9.35, 3.88 | 140.10, 243.77, 9.30 | 11 pt black, right-aligned |
| 4 | `footnoteDesignCode` | Footnote Design Code | Eurocode 1991 | 92.43, 265.64, 21.52, 4.23 | 113.90, 268.82, 21.45 | 10 pt gray, right-aligned |
| 4 | `footnoteWindLoad` | Footnote Wind Load | 250N/m² | 41.10, 269.88, 12.88, 4.23 | 53.98, 273.23, 12.80 | 10 pt gray, right-aligned |
| 5 | `commissioningWorkingDays` | Commissioning Technician Working Days | XX | 63.15, 47.27, 3.88, 4.76 | 67.03, 50.98, 3.82 | 11 pt gray, right-aligned |
| 6 | `pilePricePerMWpWhole` | Piles Price per MWp — Whole Number | 550 | 179.39, 35.45, 5.97, 4.06 | 185.20, 38.63, 5.75 | 11 pt black, right-aligned |
| 6 | `installationManworkRateWhole` | Installation Manworks Daily Rate — Whole Number | 500 | 179.39, 77.08, 5.97, 4.76 | 185.20, 80.96, 5.65 | 11 pt black, right-aligned |
| 6 | `extendedManworkRateWhole` | Extended Manworks Daily Rate — Whole Number | 600 | 179.39, 88.55, 5.97, 4.76 | 185.20, 92.43, 5.65 | 11 pt black, right-aligned |
| 11 | `generalLayoutReference` | General Layout Reference | XXXXXXX | 53.80, 116.42, 12.88, 4.23 | 66.68, 119.77, 12.80 | 10 pt gray, right-aligned |

## Ambiguity retained

`trackerOfferQuantity` reproduces the highlighted `kWp` text in the page-4 Qty column. The template does not make clear whether this region will ultimately contain project capacity, a unit label, or another commercial quantity. It remains a standalone `source=TBD` field; no business source or calculation has been assigned.

# LUMA quotation PDF parameter map

This map lists every value that the current application places in the generated 10-page quotation PDF. It uses the page numbers visible in the generated PDF. Some older internal layout references use source pages 4, 5, 6, and 11; these correspond to generated PDF pages 3, 4, 5, and 10.

## Control types

- **Quotation input**: directly editable in the Quotation tab.
- **Automatic + override**: calculated or read from the project; a user can replace it in Quotation Draft Fields.
- **Administration default + override**: loaded from commercial settings; a user can replace it in Quotation Draft Fields.
- **Calculated output**: produced by the application and not edited as a separate quotation field.
- **Combined output**: composed from two or more inputs.

## PDF page 1 - Cover

| PDF value | TeX parameter | Control/source | Rule |
| --- | --- | --- | --- |
| Client company | `\QFClientCompany` | Quotation input | Customer Company |
| Project capacity | `\QFProjectMWp` | Calculated output | Total project power in MWp |
| Project location | `\QFProjectLocation` | Quotation input | Maximum 30 characters |
| Contact title | `\QFClientTitle` | Quotation input | Mr, Mrs, Ms, Dr, or MR/MRs |
| Contact name | `\QFClientName` | Combined output | First Name + Last Name |
| Address | `\QFClientAddress` | Quotation input | Customer address |
| Postal code and city | `\QFClientPostalCity` | Combined output | Postal Code + ` - ` + City |
| Country | `\QFClientCountry` | Quotation input | Customer country |
| Quotation number | `\QFQuotationNumber` | Quotation input | Quotation reference |
| Revision/version | `\QFQuotationVersion` | Quotation input | Printed after the quotation number |
| Quotation date | `\QFQuotationDate` | Quotation input | Converted from `yyyy-mm-dd` to `dd/mm/yyyy` |

## PDF page 2 - LUMA introduction

No application parameters are printed on this page.

## PDF page 3 - Offer and project configuration

| PDF value | TeX parameter | Control/source | Rule |
| --- | --- | --- | --- |
| Tracker offer quantity | `\QFTrackerOfferQuantity` | Automatic + override | Project MWp x 1,000, shown as kWp |
| Tracker price per kW | `\QFTrackerPricePerKw` | Quotation input | Price per kW entered in the Quotation tab |
| Tracker offer total | `\QFTrackerOfferTotal` | Calculated output | Tracker offer quantity x price per kW |
| Currency symbol | `\QFCurrencySymbol` | Quotation input/output | Derived from selected quotation currency |
| Structure configuration rows | `\QFStructureConfigurationRows` | Calculated output | One row per distinct array type: panels per structure and structure quantity |
| Panels per structure | `\QFPanelsPerStructure` | Automatic output; fallback override | Distinct PV Modules per Tracker values; the draft value is used only when no array configuration rows are available |
| Number of structures | `\QFStructureCount` | Automatic output; fallback override | Total tracker quantity; the draft value is used only when no array configuration rows are available |
| Number of piles | `\QFPileCount` | Automatic + override | Sum of main and bearing posts for every array |
| PV-module quantity | `\QFModuleCount` | Automatic + override | Total project PV modules |
| PV-module width | `\QFModuleWidthMm` | Automatic + override | PV Module Inputs, in mm |
| PV-module length | `\QFModuleLengthMm` | Automatic + override | PV Module Inputs, in mm |
| PV-module power | `\QFModulePowerWp` | Automatic + override | PV Module Capacity, in Wp |
| Tracker length | `\QFTrackerLengthM` | Automatic + override | Longest active array, rounded upward to 0.01 m |
| Tracker height with flat panels | `\QFTrackerHeightM` | Automatic + override | Project input, in m |
| Foundation depth | `\QFFoundationDepthM` | Automatic + override | Foundation depth converted from mm to m |
| Maximum tracking tilt | `\QFMaximumTrackingTilt` | Automatic + override | Project input, in degrees |
| Ground clearance at 60 degrees | `\QFGroundClearanceM` | Automatic + override | Project input, in m |
| Pitch distance | `\QFPitchDistance` | Automatic + override | Project input, in m |
| Safeguard quantity | `\QFSafeguardQuantity` | Automatic + override | BOM quantity for TAGs `k001405` and `k001406` |
| Safeguard unit price | `\QFSafeguardUnitPrice` | Administration default | Safeguard Price |
| Safeguard total | `\QFSafeguardTotal` | Calculated output | Safeguard quantity x unit price |
| Monitoring-system quantity | `\QFMonitoringQuantity` | Automatic + override | BOM quantity for TAG `k001525` |
| Monitoring-system unit price | `\QFMonitoringUnitPrice` | Administration default | Monitoring System Price |
| Monitoring-system total | `\QFMonitoringTotal` | Calculated output | Monitoring quantity x unit price |
| Engineering-services quantity | Static value | Fixed output | Always 1 |
| Engineering-services unit price | `\QFEngineeringUnitPrice` | Administration default | Engineering Services Price |
| Engineering-services total | `\QFEngineeringTotal` | Calculated output | Currently equal to its unit price |
| Commissioning quantity | Static value | Fixed output | Always 1 |
| Commissioning price | `\QFCommissioningPrice` | Administration default + override | Commissioning and Testing Price |
| Commissioning total | `\QFCommissioningTotal` | Calculated output | Currently equal to its unit price |
| Design-code footnote | `\QFFootnoteDesignCode` | Quotation draft input | Default text: Eurocode 1991 |
| Wind-load footnote | `\QFFootnoteWindLoad` | Quotation draft input | Default text: 250N/m2 |

## PDF page 4 - Commissioning continuation and total

| PDF value | TeX parameter | Control/source | Rule |
| --- | --- | --- | --- |
| Technician working days | `\QFCommissioningWorkingDays` | Administration default + override | Technician Working Days |
| Quotation total | `\QFQuotationTotal` | Calculated output | Grand total for the selected quotation currency from the commercial analysis |
| Currency symbol | `\QFCurrencySymbol` | Quotation input/output | Derived from selected quotation currency |
| Currency code | `\QFCurrencyCode` | Quotation input/output | Selected quotation currency |

## PDF page 5 - Supplements

| PDF value | TeX parameter | Control/source | Rule |
| --- | --- | --- | --- |
| Pile supplement per MWp | `\QFPilePricePerMWp` | Administration default + override | Pile Supplement / MWp |
| Installation manwork rate per day | `\QFInstallationManworkRate` | Administration default + override | Manworks Installation / day |
| Extended KSI staff rate per day | `\QFExtendedManworkRate` | Administration default + override | Extended KSI Staff / day |
| Currency symbol | `\QFCurrencySymbol` | Quotation input/output | Derived from selected quotation currency |
| Currency code | `\QFCurrencyCode` | Quotation input/output | Selected quotation currency |

## PDF pages 6-9 - Terms and Conditions

These pages currently contain no connected application parameters.

Two saved administration values appear to be intended for PDF page 6 but are still fixed template text:

| Saved value | Current PDF text | Current status |
| --- | --- | --- |
| Delivery Time (weeks) | `up to 20 weeks` | Not connected to the LaTeX parameter file |
| Offer Validity (days) | `valid for 7 days` | Not connected to the LaTeX parameter file |

Changing either saved value does not currently change the generated PDF.

## PDF page 10 - Signatures and attachments

| PDF value | TeX parameter | Control/source | Rule |
| --- | --- | --- | --- |
| General layout reference | `\QFGeneralLayoutReference` | Quotation input | Printed in the Attachments list |

## Values present in the quotation model but not printed

The application also carries Project Country, Foundation Method, Project ID, Project Code, Project Name, commercial gap count, and generation timestamp in its quotation model or saved snapshot. The current LaTeX document does not print these values.

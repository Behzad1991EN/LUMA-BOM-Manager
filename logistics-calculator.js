'use strict';

(function initializeLogisticsCalculator(global) {
  const CARGO_CAPACITIES = Object.freeze({
    'Steel Structure': Object.freeze({type:'weight', unit:'kg', basisLabel:'Weight', valueLabel:'Container Capacity'}),
    'Slew Drive': Object.freeze({type:'quantity', unit:'pcs', basisLabel:'Quantity', valueLabel:'Slew Drives per Container'}),
    'Bearing': Object.freeze({type:'quantity', unit:'pcs', basisLabel:'Quantity', valueLabel:'Bearings per Container'}),
  });
  const CARGO_GROUPS = Object.freeze(Object.keys(CARGO_CAPACITIES));
  const ROUTE_METHODS = Object.freeze({
    direct: 'Direct Origin → Site',
    fob_port_site: 'FOB → Port → Site',
    port_warehouse_site: 'Port → Warehouse → Site',
    fob_port_warehouse_site: 'FOB → Port → Warehouse → Site',
    legacy: 'Legacy Combined Rate',
  });
  const DEFAULT_RATE_VALUES = Object.freeze({
    'Steel Structure': Object.freeze({capacity_value:22000, route_method:'port_warehouse_site', port_to_warehouse_per_container:400, warehouse_unloading_per_container:400, warehouse_truck_loading_per_container:200, warehouse_storage_per_period:250, warehouse_storage_period_days:15, warehouse_storage_days:15, warehouse_to_site_per_container:1000, customs_clearance_per_container:0, insurance_per_container:0}),
    Bearing: Object.freeze({capacity_value:7176, route_method:'fob_port_site', origin_to_port_per_container:6800, port_to_site_per_container:2250, customs_clearance_per_container:0, insurance_per_container:0}),
    'Slew Drive': Object.freeze({capacity_value:594, route_method:'port_warehouse_site', port_to_warehouse_per_container:400, warehouse_unloading_per_container:400, warehouse_truck_loading_per_container:200, warehouse_storage_per_period:250, warehouse_storage_period_days:15, warehouse_storage_days:15, warehouse_to_site_per_container:1000, customs_clearance_per_container:0, insurance_per_container:0}),
  });
  const REQUIRED_EXTERNAL_FIELDS = Object.freeze([
    'fob_per_container', 'cif_per_container', 'customs_clearance_per_container',
  ]);

  function configuredNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function internalField(deliveryPoint) {
    return deliveryPoint === 'Warehouse' ? 'internal_warehouse_per_container' : 'internal_site_per_container';
  }

  function capacitySpec(cargoGroup) {
    return CARGO_CAPACITIES[String(cargoGroup || '')] || null;
  }

  function calculateContainerCount({capacityType, shipmentWeightKg, shipmentQuantity, capacityValue} = {}) {
    const type = capacityType === 'quantity' ? 'quantity' : capacityType === 'weight' ? 'weight' : '';
    const capacity = configuredNumber(capacityValue);
    const amount = configuredNumber(type === 'weight' ? shipmentWeightKg : type === 'quantity' ? shipmentQuantity : null);
    const missingFields = [];
    if (!type) missingFields.push('capacityType');
    if (capacity === null) missingFields.push('capacityValue');
    else if (capacity === 0) missingFields.push('capacityValuePositive');
    if (amount === null) missingFields.push(type === 'quantity' ? 'shipmentQuantity' : 'shipmentWeightKg');
    if (missingFields.length) return {complete:false, capacityType:type, capacityValue:capacity, shipmentAmount:amount, missingFields};
    return {complete:true, capacityType:type, capacityValue:capacity, shipmentAmount:amount, containerCount:amount === 0 ? 0 : Math.ceil(amount / capacity), missingFields:[]};
  }

  function calculateLegacy(values) {
    const capacityType = values?.capacityType || (values?.containerCapacityKg !== undefined ? 'weight' : '');
    const capacityValue = values?.capacityValue ?? values?.containerCapacityKg;
    const containerResult = calculateContainerCount({
      capacityType,
      shipmentWeightKg:values?.shipmentWeightKg ?? values?.totalWeightKg,
      shipmentQuantity:values?.shipmentQuantity,
      capacityValue,
    });
    const deliveryPoint = values?.deliveryPoint === 'Warehouse' ? 'Warehouse' : 'Site';
    const selectedInternalField = internalField(deliveryPoint);
    const costs = Object.fromEntries([...REQUIRED_EXTERNAL_FIELDS, selectedInternalField].map(field => [field, configuredNumber(values?.[field])]));
    const missingFields = [];
    missingFields.push(...containerResult.missingFields);
    for (const [field, value] of Object.entries(costs)) if (value === null) missingFields.push(field);
    if (missingFields.length) return {complete:false, deliveryPoint, missingFields};
    const containerCount = containerResult.containerCount;
    const fobTotal = containerCount * costs.fob_per_container;
    const cifTotal = containerCount * costs.cif_per_container;
    const customsClearanceTotal = containerCount * costs.customs_clearance_per_container;
    const externalLogisticsTotal = fobTotal + cifTotal + customsClearanceTotal;
    const internalCostPerContainer = costs[selectedInternalField];
    const internalLogisticsTotal = containerCount * internalCostPerContainer;
    return {
      complete:true, deliveryPoint, capacityType:containerResult.capacityType,
      capacityValue:containerResult.capacityValue, shipmentAmount:containerResult.shipmentAmount,
      totalWeightKg:containerResult.capacityType === 'weight' ? containerResult.shipmentAmount : null,
      shipmentQuantity:containerResult.capacityType === 'quantity' ? containerResult.shipmentAmount : null,
      containerCapacityKg:containerResult.capacityType === 'weight' ? containerResult.capacityValue : null,
      containerCount, fobPerContainer:costs.fob_per_container, fobTotal,
      cifPerContainer:costs.cif_per_container, cifTotal,
      customsClearancePerContainer:costs.customs_clearance_per_container,
      customsClearanceTotal, externalLogisticsTotal, internalCostPerContainer,
      internalLogisticsTotal, totalLogisticsCost:externalLogisticsTotal + internalLogisticsTotal,
      missingFields:[],
    };
  }

  function routeValue(values, field) {
    return configuredNumber(values?.[field]);
  }

  function calculateRoute(values) {
    const routeMethod = String(values?.routeMethod || values?.route_method || '').trim();
    if (!ROUTE_METHODS[routeMethod] || routeMethod === 'legacy') return calculateLegacy(values);
    const capacityType = values?.capacityType || values?.capacity_type || '';
    const capacityValue = values?.capacityValue ?? values?.capacity_value ?? values?.container_capacity_kg;
    const containerResult = calculateContainerCount({
      capacityType,
      shipmentWeightKg:values?.shipmentWeightKg ?? values?.totalWeightKg,
      shipmentQuantity:values?.shipmentQuantity,
      capacityValue,
    });
    const required = ['customs_clearance_per_container', 'insurance_per_container'];
    if (routeMethod === 'direct') required.push('direct_transport_per_container');
    if (routeMethod === 'fob_port_site') required.push('origin_to_port_per_container', 'port_to_site_per_container');
    if (routeMethod === 'port_warehouse_site' || routeMethod === 'fob_port_warehouse_site') {
      if (routeMethod === 'fob_port_warehouse_site') required.push('origin_to_port_per_container');
      required.push('port_to_warehouse_per_container', 'warehouse_unloading_per_container', 'warehouse_truck_loading_per_container', 'warehouse_storage_per_period', 'warehouse_storage_period_days', 'warehouse_storage_days', 'warehouse_to_site_per_container');
    }
    const costs = Object.fromEntries(required.map(field => [field, routeValue(values, field)]));
    const missingFields = [...containerResult.missingFields];
    for (const [field, value] of Object.entries(costs)) if (value === null) missingFields.push(field);
    if (costs.warehouse_storage_period_days === 0) missingFields.push('warehouse_storage_period_days_positive');
    if (missingFields.length) return {complete:false, routeMethod, routeLabel:ROUTE_METHODS[routeMethod], missingFields:[...new Set(missingFields)]};

    const storagePeriods = costs.warehouse_storage_days === undefined ? 0 : costs.warehouse_storage_days === 0 ? 0 : Math.ceil(costs.warehouse_storage_days / costs.warehouse_storage_period_days);
    const storageCostPerContainer = (costs.warehouse_storage_per_period || 0) * storagePeriods;
    const originToPort = costs.origin_to_port_per_container || 0;
    const direct = costs.direct_transport_per_container || 0;
    const portToSite = costs.port_to_site_per_container || 0;
    const portToWarehouse = costs.port_to_warehouse_per_container || 0;
    const unloading = costs.warehouse_unloading_per_container || 0;
    const truckLoading = costs.warehouse_truck_loading_per_container || 0;
    const warehouseToSite = costs.warehouse_to_site_per_container || 0;
    const warehouseHandlingPerContainer = portToWarehouse + unloading + truckLoading + storageCostPerContainer;
    let transportPerContainer = 0;
    if (routeMethod === 'direct') transportPerContainer = direct;
    else if (routeMethod === 'fob_port_site') transportPerContainer = originToPort + portToSite;
    else if (routeMethod === 'port_warehouse_site') transportPerContainer = warehouseHandlingPerContainer + warehouseToSite;
    else transportPerContainer = originToPort + warehouseHandlingPerContainer + warehouseToSite;
    const customsPerContainer = costs.customs_clearance_per_container || 0;
    const insurancePerContainer = costs.insurance_per_container || 0;
    const totalCostPerContainer = transportPerContainer + customsPerContainer + insurancePerContainer;
    const unitLogisticsCost = totalCostPerContainer / containerResult.capacityValue;
    const capacityUtilization = containerResult.shipmentAmount / containerResult.capacityValue;
    const allocatedProjectCost = unitLogisticsCost * containerResult.shipmentAmount;
    const fullContainerProjectCost = totalCostPerContainer * containerResult.containerCount;
    const externalPerContainer = originToPort + customsPerContainer + insurancePerContainer;
    const internalPerContainer = totalCostPerContainer - externalPerContainer;
    return {
      complete:true, routeMethod, routeLabel:ROUTE_METHODS[routeMethod],
      capacityType:containerResult.capacityType, capacityValue:containerResult.capacityValue,
      capacityUnit:containerResult.capacityType === 'weight' ? 'kg' : 'pcs',
      shipmentAmount:containerResult.shipmentAmount, containerCount:containerResult.containerCount,
      capacityUtilization, storagePeriods, storageCostPerContainer,
      warehouseHandlingPerContainer, transportPerContainer, customsPerContainer,
      insurancePerContainer, totalCostPerContainer, unitLogisticsCost,
      allocatedProjectCost, fullContainerProjectCost,
      externalLogisticsTotal:externalPerContainer * capacityUtilization,
      internalLogisticsTotal:internalPerContainer * capacityUtilization,
      totalLogisticsCost:allocatedProjectCost, missingFields:[],
    };
  }

  function calculate(values) {
    const method = String(values?.routeMethod || values?.route_method || '').trim();
    return method && method !== 'legacy' ? calculateRoute(values) : calculateLegacy(values);
  }

  function rateIsCurrent(rate, date = new Date()) {
    const day = date.toISOString().slice(0, 10);
    return rate?.active === true && (!rate.valid_from || rate.valid_from <= day) && (!rate.valid_until || rate.valid_until >= day);
  }

  function findRate(rates, {originCountry, destinationCountry, cargoGroup, rateId='', date = new Date()}) {
    const countries = global.LumaCountryData;
    const origin = countries.canonicalLogisticsOrigin(originCountry);
    const destination = countries.canonicalEuropeanCountry(destinationCountry);
    const matches = (Array.isArray(rates) ? rates : []).filter(rate =>
      rateIsCurrent(rate, date) &&
      countries.canonicalLogisticsOrigin(rate.origin_country) === origin &&
      countries.canonicalEuropeanCountry(rate.destination_country) === destination &&
      String(rate.cargo_group || '') === String(cargoGroup || '')
    );
    const selected=rateId?matches.find(rate=>String(rate.id)===String(rateId)):null;
    return {status:selected||matches.length===1?'found':matches.length>1?'selection_required':'missing',rate:selected||(matches.length===1?matches[0]:null),matches};
  }

  global.LumaLogisticsCalculator = Object.freeze({CARGO_CAPACITIES, CARGO_GROUPS, ROUTE_METHODS, DEFAULT_RATE_VALUES, capacitySpec, calculateContainerCount, calculateRoute, calculate, findRate, rateIsCurrent});
})(window);

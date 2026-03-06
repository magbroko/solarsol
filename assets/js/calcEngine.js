/**
 * SolarSol — Nigerian Solar ROI Calculation Engine
 * Pure math logic. Update AVG_KWH_COST when tariff bands change.
 */
(function (global) {
    'use strict';

    /* ================================================
       TARIFF & CONSTANTS (adjust when NERC updates)
       Band A: ~₦209/kWh | Band B: ~₦206 | Band C: ~₦203
    ================================================ */
    var AVG_KWH_COST = 209;
    var PEAK_SUN_HOURS = 5.5;
    var PANEL_WATTAGE = 0.55;  /* 550W Mono-PERC panels */
    var HEAT_DERATE = 1.25;
    var BATTERY_DAYS_BACKUP = 1.5;
    var COST_PER_KW = 850000;
    var MONTHLY_MULTIPLIER = [0.9, 0.92, 1.0, 1.05, 1.1, 1.08, 1.05, 1.02, 1.0, 1.02, 0.98, 0.95];
    var TARIFF_INFLATION_RATE = 0.08;
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        /* Generator fuel savings (₦/month) — typical diesel/petrol savings */
        GENERATOR_SAVINGS_MIN = 50000,
        GENERATOR_SAVINGS_MAX = 150000,
        LITERS_PER_KWH_GEN = 0.25,
        LITERS_PER_TREE = 22,
        FUEL_PRICE_PER_LITER = 1100;  /* Nigerian petrol/diesel ~₦1,100/L */

    var INVERTER_SIZES = [1.5, 3.5, 5, 7.5, 10];

    var CalcEngine = {
        setConfig: function (opts) {
            if (opts.avgKwhCost != null) AVG_KWH_COST = opts.avgKwhCost;
            if (opts.peakSunHours != null) PEAK_SUN_HOURS = opts.peakSunHours;
        },

        getConfig: function () {
            return {
                avgKwhCost: AVG_KWH_COST,
                peakSunHours: PEAK_SUN_HOURS
            };
        },

        /**
         * @param {Object} input - { monthlyBill, bedrooms, gridHours, location, priorityLoads }
         * priorityLoads: { fridge: bool, ac: bool, pump: bool }
         * @returns {Object} Calculation results
         */
        calculate: function (input) {
            var monthlyBill = parseFloat(input.monthlyBill) || 0;
            var bedrooms = parseInt(input.bedrooms, 10) || 3;
            var gridHours = parseInt(input.gridHours, 10) || 12;
            var peakSun = parseFloat(input.peakSunHours) || PEAK_SUN_HOURS;
            var loads = input.priorityLoads || {};

            var monthlyKwh = monthlyBill > 0 ? monthlyBill / AVG_KWH_COST : 0;
            var systemSizeKw = monthlyKwh > 0
                ? (monthlyKwh / 30 / peakSun) * HEAT_DERATE
                : 0;
            var batterySizeKwh = monthlyKwh > 0
                ? (monthlyKwh / 30) * BATTERY_DAYS_BACKUP
                : 0;
            var panelsNeeded = systemSizeKw > 0
                ? Math.ceil(systemSizeKw / PANEL_WATTAGE)
                : 0;

            var hardware = CalcEngine.calculateHardware(monthlyBill, systemSizeKw, batterySizeKwh, loads);

            var systemCost = systemSizeKw * COST_PER_KW;
            var monthlyDisco = monthlyBill;
            var monthlySolarSavings = monthlyBill * 0.85;
            var generatorSavings = monthlyBill > 100000 ? GENERATOR_SAVINGS_MAX : GENERATOR_SAVINGS_MIN;
            var totalMonthlySavings = monthlySolarSavings + (generatorSavings * (gridHours < 12 ? 1 : 0.6));

            var annualSavings = totalMonthlySavings * 12;
            var paybackYears = annualSavings > 0 ? systemCost / annualSavings : 0;

            var litersSaved = Math.round(monthlyKwh * LITERS_PER_KWH_GEN * 12);
            var treesEquivalent = Math.round(litersSaved / LITERS_PER_TREE);

            var monthlyDiscoData = [];
            var monthlySolarData = [];
            var roiData = [];
            var gridCostData = [];
            var cumulative = 0;
            var gridCost = monthlyBill;

            for (var m = 0; m < 12; m++) {
                var mult = MONTHLY_MULTIPLIER[m];
                monthlyDiscoData.push(Math.round(monthlyBill * mult));
                monthlySolarData.push(Math.round(monthlySolarSavings * mult));
            }

            for (var y = 0; y <= 20; y++) {
                roiData.push(Math.round(cumulative));
                gridCostData.push(Math.round(gridCost));
                cumulative += annualSavings;
                gridCost *= (1 + TARIFF_INFLATION_RATE);
            }

            var litersPerMonth = Math.round(monthlyKwh * LITERS_PER_KWH_GEN);
            var fuelCostPerMonth = litersPerMonth * FUEL_PRICE_PER_LITER;
            var generatorCostPerMonth = fuelCostPerMonth;

            return {
                monthlyKwh: monthlyKwh,
                systemSizeKw: systemSizeKw,
                batterySizeKwh: batterySizeKwh,
                panelsNeeded: panelsNeeded,
                systemCost: systemCost,
                monthlyBill: monthlyBill,
                monthlySolarSavings: monthlySolarSavings,
                generatorSavings: generatorSavings,
                totalMonthlySavings: totalMonthlySavings,
                annualSavings: annualSavings,
                paybackYears: paybackYears,
                litersSaved: litersSaved,
                litersPerMonth: litersPerMonth,
                fuelCostPerMonth: fuelCostPerMonth,
                generatorCostPerMonth: generatorCostPerMonth,
                treesEquivalent: treesEquivalent,
                monthlyDiscoData: monthlyDiscoData,
                monthlySolarData: monthlySolarData,
                roiData: roiData,
                gridCostData: gridCostData,
                months: MONTHS,
                avgKwhCost: AVG_KWH_COST,
                hardware: hardware,
                fuelPricePerLiter: FUEL_PRICE_PER_LITER
            };
        },

        /**
         * @param {number} bill - Monthly bill (₦)
         * @param {number} systemSizeKw - Calculated system size
         * @param {number} batterySizeKwh - Calculated battery size
         * @param {Object} loads - { fridge, ac, pump }

         * Inverter logic: AC→3.5KVA min; Pump→3.5KVA min (+1000W surge);
         * lights only→1.5KVA; else round up to 1.5, 3.5, 5, 7.5, 10KVA
         */
        calculateHardware: function (bill, systemSizeKw, batterySizeKwh, loads) {
            var hasAC = loads.ac === true;
            var hasPump = loads.pump === true;
            var hasFridge = loads.fridge === true;

            var minInverterKva = 1.5;
            var reasonParts = [];

            if (hasAC) {
                minInverterKva = Math.max(minInverterKva, 3.5);
                reasonParts.push('AC');
            }
            if (hasPump) {
                minInverterKva = Math.max(minInverterKva, 3.5);
                reasonParts.push('water pump (surge)');
            }
            if (hasFridge && !hasAC && !hasPump) {
                minInverterKva = Math.max(minInverterKva, 2.4);
                reasonParts.push('fridge/freezer');
            }
            if (!hasAC && !hasPump && !hasFridge) {
                minInverterKva = 1.5;
                reasonParts.push('lights/TV/fans');
            }

            var reqKvaFromBill = systemSizeKw > 0 ? systemSizeKw * 1.2 : 1.5;
            var inverterKva = Math.max(minInverterKva, reqKvaFromBill);

            var found = false;
            for (var i = 0; i < INVERTER_SIZES.length; i++) {
                if (INVERTER_SIZES[i] >= inverterKva) {
                    inverterKva = INVERTER_SIZES[i];
                    found = true;
                    break;
                }
            }
            if (!found) inverterKva = INVERTER_SIZES[INVERTER_SIZES.length - 1];

            var batteryVoltage = inverterKva >= 5 ? '48V' : (inverterKva >= 3.5 ? '24V' : '12V/24V');
            var batteryAh = Math.ceil((batterySizeKwh * 1000) / (batteryVoltage === '48V' ? 48 : 24));
            var batteryCount = Math.ceil(batteryAh / 200);
            if (batteryCount < 1) batteryCount = 1;
            var batteryConfig = batteryCount + ' x 200Ah Deep Cycle (' + batteryVoltage + ')';
            var lithiumOption = '1 x ' + Math.round(batterySizeKwh) + 'kWh Lithium';

            if (reasonParts.length === 0) {
                reasonParts.push('your bill size');
            }
            var whyTooltip = 'This covers ' + reasonParts.join(', ') + ' and nighttime backup.';

            var panelsNeeded = systemSizeKw > 0 ? Math.ceil(systemSizeKw / PANEL_WATTAGE) : 0;
            var panelSpec = panelsNeeded + ' x 550W Mono-PERC Panels';

            return {
                inverterKva: inverterKva,
                systemLabel: inverterKva + 'KVA Hybrid System',
                panelSpec: panelSpec,
                panelsNeeded: panelsNeeded,
                batteryConfig: batteryConfig,
                lithiumOption: lithiumOption,
                batteryVoltage: batteryVoltage,
                batteryCount: batteryCount,
                whyTooltip: whyTooltip,
                hasAC: hasAC,
                hasPump: hasPump,
                hasFridge: hasFridge
            };
        }
    };

    global.SolarCalcEngine = CalcEngine;
})(typeof window !== 'undefined' ? window : this);

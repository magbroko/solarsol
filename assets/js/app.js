/**
 * SolarSol — Nigerian ROI Calculator UI (app.js)
 * Handles form state, Chart.js, Intl.NumberFormat, and quote modal.
 */
(function () {
    'use strict';

    var NGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    var currentStep = 1;
    var barChart = null;
    var lineChart = null;

    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

    function formatNaira(num) {
        if (num == null || num !== num || typeof num !== 'number') return '—';
        return NGN.format(Math.round(num));
    }

    function safeInt(val, fallback) {
        var n = parseInt(val, 10);
        return (n === n && !isNaN(n)) ? n : (fallback || 0);
    }

    function safeFloat(val, fallback) {
        var n = parseFloat(val);
        return (n === n && !isNaN(n)) ? n : (fallback || 0);
    }

    function getFormData() {
        var billEl = $('roiMonthlyBill');
        var bill = safeInt(billEl ? billEl.value : null, 100000);
        var bedEl = qs('input[name="bedrooms"]:checked');
        var gridEl = qs('input[name="gridHours"]:checked');
        var bedrooms = safeInt(bedEl ? bedEl.value : null, 3);
        var gridHours = safeInt(gridEl ? gridEl.value : null, 12);
        var locEl = $('roiLocation');
        var location = (locEl && locEl.value) ? String(locEl.value).trim() : '';
        var priorityLoads = {
            fridge: !!($('loadFridge') && $('loadFridge').checked),
            ac: !!($('loadAC') && $('loadAC').checked),
            pump: !!($('loadPump') && $('loadPump').checked)
        };
        return {
            monthlyBill: bill,
            bedrooms: bedrooms,
            gridHours: gridHours,
            location: location,
            peakSunHours: 5.5,
            priorityLoads: priorityLoads
        };
    }

    function runCalc() {
        if (typeof SolarCalcEngine === 'undefined') return null;
        return SolarCalcEngine.calculate(getFormData());
    }

    function updateProgress() {
        var fill = $('roiProgressFill');
        var pct = (currentStep / 4) * 100;
        if (fill) {
            fill.style.width = pct + '%';
            fill.setAttribute('aria-valuenow', Math.round(pct));
        }
        var bar = document.querySelector('.roi-progress-bar');
        if (bar) bar.setAttribute('aria-valuenow', Math.round(pct));
        qsa('.roi-step-icon').forEach(function (el) {
            el.classList.toggle('active', safeInt(el.getAttribute('data-step'), 0) === currentStep);
        });
    }

    function hideValidationAlert() {
        var alertEl = $('roiValidationAlert');
        if (alertEl) { alertEl.classList.add('d-none'); alertEl.innerHTML = ''; }
    }

    function showValidationAlert(msg) {
        var alertEl = $('roiValidationAlert');
        if (alertEl) {
            alertEl.className = 'alert alert-warning alert-dismissible fade show';
            alertEl.classList.remove('d-none');
            alertEl.innerHTML = msg + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
        }
    }

    function goToStep(n) {
        if (n < 1 || n > 4) return;
        hideValidationAlert();
        currentStep = n;
        qsa('.roi-step').forEach(function (el) {
            var step = parseInt(el.getAttribute('data-step'), 10);
            el.classList.toggle('active', step === n);
            el.classList.toggle('d-none', step !== n);
        });
        updateProgress();
        $('roiBtnPrev').disabled = n <= 1;
        var nextBtn = $('roiBtnNext');
        nextBtn.classList.toggle('d-none', n === 4);
        nextBtn.innerHTML = (n === 3 ? 'See Results' : 'Next') + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        if (n === 4) renderDashboard();
    }

    function updateBillDisplay() {
        var billEl = $('roiMonthlyBill');
        var v = safeInt(billEl ? billEl.value : null, 100000);
        var el = $('roiBillDisplay');
        if (el) el.textContent = formatNaira(v);
        updatePreviews();
    }

    function updatePreviews() {
        var r = runCalc();
        if (!r) return;
        var kwhEl = $('roiKwhPreview');
        var sysEl = $('roiSystemPreview');
        var panEl = $('roiPanelsPreview');
        var batEl = $('roiBatteryPreview');
        if (kwhEl) kwhEl.textContent = r.monthlyKwh > 0 ? Math.round(r.monthlyKwh) + ' kWh' : '—';
        if (sysEl) sysEl.textContent = r.systemSizeKw > 0 ? r.systemSizeKw.toFixed(1) + ' kW' : '—';
        if (panEl) panEl.textContent = r.panelsNeeded > 0 ? Math.ceil(r.panelsNeeded) + ' panels' : '—';
        if (batEl) batEl.textContent = r.batterySizeKwh > 0 ? r.batterySizeKwh.toFixed(1) + ' kWh' : '—';
    }

    function renderDashboard() {
        var r = runCalc();
        if (!r) return;
        var sysKw = $('roiSystemKw');
        var panCount = $('roiPanelsCount');
        var payback = $('roiPaybackYears');
        var liters = $('roiLitersSaved');
        var trees = $('roiTreesEquivalent');
        if (sysKw) sysKw.textContent = r.systemSizeKw > 0 ? r.systemSizeKw.toFixed(1) + ' kW' : '—';
        if (panCount) panCount.textContent = r.panelsNeeded > 0 ? Math.ceil(r.panelsNeeded) : '—';
        if (payback) payback.textContent = r.paybackYears > 0 ? r.paybackYears.toFixed(1) + ' yrs' : '—';
        if (liters) liters.textContent = r.litersSaved > 0 ? r.litersSaved.toLocaleString() : '—';
        if (trees) trees.textContent = r.treesEquivalent > 0 ? r.treesEquivalent.toLocaleString() : '—';
        renderHardwareCard(r);
        renderComparisonCard(r);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { initCharts(r); });
        });
        prefillQuoteModal(r);
    }

    function renderHardwareCard(r) {
        var h = r.hardware;
        if (!h) return;
        var sysLabel = $('roiHardwareSystemLabel');
        var panelsEl = $('roiHardwarePanels');
        var batteryEl = $('roiHardwareBattery');
        var lithiumEl = $('roiHardwareLithium');
        var whyEl = $('roiWhyTooltip');
        if (sysLabel) sysLabel.textContent = h.systemLabel || '—';
        if (panelsEl) panelsEl.textContent = h.panelSpec || '—';
        if (batteryEl) batteryEl.textContent = h.batteryConfig || '—';
        if (lithiumEl) lithiumEl.textContent = h.lithiumOption || '—';
        if (whyEl) {
            whyEl.setAttribute('title', h.whyTooltip || '');
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip && !bootstrap.Tooltip.getInstance(whyEl)) {
                new bootstrap.Tooltip(whyEl, { trigger: 'hover' });
            }
        }
    }

    function renderComparisonCard(r) {
        var litersEl = $('roiLitersPerMonth');
        var fuelEl = $('roiFuelCostMonth');
        var annualEl = $('roiAnnualFuelSave');
        if (litersEl) litersEl.textContent = r.litersPerMonth > 0 ? r.litersPerMonth.toLocaleString() + ' L' : '—';
        if (fuelEl) fuelEl.textContent = formatNaira(r.fuelCostPerMonth);
        if (annualEl) annualEl.textContent = formatNaira(r.fuelCostPerMonth > 0 ? r.fuelCostPerMonth * 12 : 0);
    }

    function prefillQuoteModal(r) {
        if (!$('quoteSystemSizeKw')) return;
        var fd = getFormData();
        $('quoteSystemSizeKw').value = (r.systemSizeKw != null && !isNaN(r.systemSizeKw)) ? r.systemSizeKw : '';
        $('quotePanels').value = (r.panelsNeeded != null && !isNaN(r.panelsNeeded)) ? Math.ceil(r.panelsNeeded) : '';
        $('quoteMonthlyBill').value = (r.monthlyBill != null && !isNaN(r.monthlyBill)) ? r.monthlyBill : '';
        $('quoteLocation').value = fd.location || '';
        var invEl = $('quoteInverterKva');
        if (invEl && r.hardware && r.hardware.inverterKva != null) invEl.value = r.hardware.inverterKva;
    }

    var CHART_THEME = {
        solar: '#7B1E1E',
        solarFill: 'rgba(123,30,30,0.25)',
        grid: '#1F2937',
        gridLine: '#E5E7EB'
    };

    function initCharts(r) {
        if (typeof Chart === 'undefined') return;
        if (barChart) { barChart.destroy(); barChart = null; }
        if (lineChart) { lineChart.destroy(); lineChart = null; }

        var barCtx = $('roiBarChart');
        if (barCtx) {
            barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: r.months,
                    datasets: [
                        { label: 'Monthly Disco Bill (₦)', data: r.monthlyDiscoData, backgroundColor: CHART_THEME.grid, borderRadius: 8 },
                        { label: 'Projected Solar Savings (₦)', data: r.monthlySolarData, backgroundColor: CHART_THEME.solar, borderRadius: 8 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: CHART_THEME.gridLine },
                            ticks: { callback: function(v) { return '₦' + (v/1000) + 'k'; } }
                        },
                        x: { grid: { color: CHART_THEME.gridLine } }
                    }
                }
            });
        }

        var lineCtx = $('roiLineChart');
        if (lineCtx) {
            lineChart = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: Array.from({ length: 21 }, function(_, i) { return i; }),
                    datasets: [
                        { label: 'Cumulative Savings (₦)', data: r.roiData, borderColor: CHART_THEME.solar, backgroundColor: CHART_THEME.solarFill, fill: true, tension: 0.3, pointRadius: 2 },
                        { label: 'System Cost (Break-even)', data: Array(21).fill(r.systemCost), borderColor: CHART_THEME.grid, borderDash: [6,4], fill: false, pointRadius: 0 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: CHART_THEME.gridLine },
                            ticks: { callback: function(v) { return '₦' + (v/1000000).toFixed(1) + 'M'; } }
                        },
                        x: { title: { display: true, text: 'Years' }, grid: { color: CHART_THEME.gridLine } }
                    }
                }
            });
        }
    }

    function handleQuoteSubmit(e) {
        e.preventDefault();
        var btn = qs('#roiQuoteForm button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>Sending…</span>';
            setTimeout(function() {
                btn.innerHTML = 'Quote Request Sent! ✓';
                btn.style.background = '#7B1E1E';
                setTimeout(function() {
                    var modal = bootstrap.Modal.getInstance($('roiQuoteModal'));
                    if (modal) modal.hide();
                    btn.disabled = false;
                    btn.innerHTML = 'Request Custom Quote <svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px"><path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
                    btn.style.background = '';
                }, 3000);
            }, 1200);
        }
    }

    function init() {
        if (!$('roiStep1') || !$('roiBtnNext')) return;
        goToStep(1);
        updateBillDisplay();

        $('roiMonthlyBill').addEventListener('input', updateBillDisplay);
        $('roiMonthlyBill').addEventListener('change', updateBillDisplay);
        qsa('input[name="bedrooms"], input[name="gridHours"]').forEach(function(el) {
            el.addEventListener('change', updatePreviews);
        });
        qsa('#loadFridge, #loadAC, #loadPump').forEach(function(el) {
            if (el) el.addEventListener('change', updatePreviews);
        });
        if ($('roiLocation')) $('roiLocation').addEventListener('input', updatePreviews);

        var nextBtn = $('roiBtnNext');
        var prevBtn = $('roiBtnPrev');
        if (nextBtn) {
            nextBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (currentStep === 1) {
                    var locEl = $('roiLocation');
                    var loc = locEl ? (locEl.value || '').trim() : '';
                    if (loc.length < 2) {
                        showValidationAlert('Please enter your city or area (e.g. Lagos, Abuja).');
                        if (locEl) locEl.focus();
                        return;
                    }
                }
                if (currentStep === 2) {
                    var billEl = $('roiMonthlyBill');
                    var bill = safeInt(billEl ? billEl.value : null, 0);
                    if (bill < 20000 || bill > 550000) {
                        showValidationAlert('Please set your monthly bill between ₦20,000 and ₦500,000.');
                        return;
                    }
                }
                if (currentStep === 3) {
                    var bedEl = qs('input[name="bedrooms"]:checked');
                    var gridEl = qs('input[name="gridHours"]:checked');
                    if (!bedEl || !gridEl) {
                        showValidationAlert('Please select number of bedrooms and grid availability.');
                        return;
                    }
                }
                goToStep(currentStep + 1);
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', function(e) {
                e.preventDefault();
                goToStep(currentStep - 1);
            });
        }

        if ($('roiQuoteForm')) $('roiQuoteForm').addEventListener('submit', handleQuoteSubmit);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

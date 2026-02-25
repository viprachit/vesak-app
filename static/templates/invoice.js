// ============================================================================
// INVOICE TEMPLATE
// ============================================================================

function buildInvoiceBody(data) {
    // --- Description Mapping Logic ---
    let planDisplay = "";
    const plan = data.plan || "";
    const subService = data.subService || "";

    // Map plan names to display names for PDF
    if (plan === "Plan A: Patient Attendant Care") {
        planDisplay = "Patient Care Service";
    }
    else if (plan === "Plan B: Skilled Nursing") {
        planDisplay = "Nurse Service";
    }
    else if (plan === "Plan C: Chronic Management") {
        planDisplay = "Chronic and Holistic Healthcare Service";
    }
    else if (plan === "Plan D: Elderly Companion") {
        planDisplay = "Elderly and Well-being Care";
    }
    else if (plan === "Plan E: Maternal & Newborn") {
        planDisplay = "Maternal & Newborn - Support for Women during and after Pregnancy";
    }
    else if (plan === "Plan F: Rehabilitative Care") {
        // For Plan F, include the sub-service in the description
        if (subService && subService !== "") {
            planDisplay = `Rehabilitative Care for ${subService}`;
        } else {
            planDisplay = "Rehabilitative Care";
        }
    }
    else if (plan === "AlaCarte" || plan.toLowerCase().includes('a-la-carte')) {
        // For A-la-carte, show "Care Service - [Sub Service]"
        if (subService && subService !== "") {
            planDisplay = `Care Service - ${subService} `;
        } else {
            planDisplay = "Care Service";
        }
    }
    else {
        // Fallback if no match
        planDisplay = plan || "Patient Care Service";
    }

    const shiftDisplay = data.shift || "Standard Shift";

    // --- Amount Section Logic ---
    const rate = parseFloat(data.rate) || 0;
    const qty = parseFloat(data.paidQty) || 1;
    const shift = data.shift; // e.g., "Per Visit", "12-hr Day"
    const period = data.period; // e.g., "Daily", "Weekly", "Monthly"

    let paidForText = "";

    // A. Per Visit Shift
    if (shift === "Per Visit") {
        paidForText = qty === 1 ? "Paid for 1 Visit" : `Paid for ${qty} Visits`;
    }
    // B. Daily Period
    else if (period === "Daily") {
        if (qty === 1) {
            paidForText = "Paid for 1 Day";
        } else if (qty % 7 === 0) {
            // Multiple of 7 -> Convert to Weeks
            const weeks = qty / 7;
            paidForText = weeks === 1 ? "Paid for 1 Week" : `Paid for ${weeks} Weeks`;
        } else {
            paidForText = `Paid for ${qty} Days`;
        }
    }
    // C. Monthly Period
    else if (period === "Monthly") {
        paidForText = qty === 1 ? "Paid for 1 Month" : `Paid for ${qty} Months`;
    }
    // D. Weekly Period
    else if (period === "Weekly") {
        paidForText = qty === 1 ? "Paid for 1 Week" : `Paid for ${qty} Weeks`;
    }
    // Fallback
    else {
        paidForText = `Paid for ${qty} Units`;
    }

    const servicesSectionHtml = buildServicesSection(data);

    return `
    <table class="w-full mb-8">
            <thead>
                <tr class="text-white text-xs uppercase tracking-wider text-left" style="background-color:#002147">
                    <th class="p-3 w-3/5">Description</th>
                    <th class="p-3 w-2/5 text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr class="border-b border-gray-100">
                    <td class="p-4 align-top">
                        <div class="font-bold text-sm text-gray-800">${planDisplay}</div>
                        <div class="text-xs text-gray-600 mt-1">${shiftDisplay}</div>
                    </td>
                    <td class="p-4 text-right align-top">
                        <div class="text-[10px] text-gray-500 mb-1">
                            ${shift} / ${period} = Rs. ${rate}
                        </div>
                        
                        <div class="flex justify-end items-center gap-2 text-xs text-gray-700 font-medium mb-2">
                            <span class="text-red-600 font-bold text-sm">X</span>
                            <span>${paidForText}</span>
                        </div>

                        <div class="border-t border-gray-300 my-2"></div>

                        <div class="font-bold text-lg text-royal-blue">${data.totalDisp}</div>
                    </td>
                </tr>
            </tbody>
        </table>
    ${servicesSectionHtml}
    <div class="mt-4 p-4 bg-white/50 rounded border border-gray-100 relative z-20">
        <h4 class="text-xs font-bold uppercase mb-2" style="color:#002147">Notes</h4>
        <p class="text-xs text-gray-600 whitespace-pre-wrap">${data.notes}</p>
    </div>
    `;
}

// Build Services Included / Not Included section for the PDF body
function buildServicesSection(data) {
    const plan = data.plan;
    const sub = data.subService;
    if (!plan) return "";

    const isPlanF = plan.startsWith("Plan F");
    const isAlaCarte =
        plan.toLowerCase().includes("a-la-carte") || plan.startsWith("AlaCarte");

    // ---------- Plans A–E: two-column boxes ----------
    if (!isPlanF && !isAlaCarte && plan.startsWith("Plan")) {
        const letter = plan.slice(5, 6); // A / B / C / D / E

        if (["A", "B", "C", "D", "E"].includes(letter) &&
            typeof serviceLogic !== "undefined" &&
            serviceLogic[plan]) {

            // 1) Services INCLUDED: items for selected plan (except "All")
            const includedItems = serviceLogic[plan].filter(x => x !== "All");
            const includedHtml = buildBulletList(includedItems);

            // 2) Services NOT INCLUDED: all items from other Plans A–E
            const allPlanKeys = Object.keys(serviceLogic).filter(k =>
                k.startsWith("Plan A") ||
                k.startsWith("Plan B") ||
                k.startsWith("Plan C") ||
                k.startsWith("Plan D") ||
                k.startsWith("Plan E")
            );

            const otherPlanKeys = allPlanKeys.filter(k => k !== plan);

            const excludedList = [];
            otherPlanKeys.forEach(k => {
                const items = serviceLogic[k];
                items.forEach(item => {
                    if (item !== "All") {
                        // NEW: only the service text
                        excludedList.push(item);
                    }
                });
            });

            // each item as its own <li>, span inside is clickable to remove
            const excludedHtml = excludedList.map((item, idx) => `
    <li class="mb-0.5 text-xs text-gray-400 leading-snug">
        <span
            class="cursor-pointer hover:text-red-600"
            data-excluded-index="${idx}"
        >
            • ${escapeHtml(item)}
        </span>
                </li>
    `).join("");

            return `
    <div class="mt-4 grid grid-cols-2 gap-4">
                    <!-- Left: Services Included -->
                    <div class="p-3" id="col-included">
                        <h4 class="text-[10px] font-bold uppercase mb-1" style="color:#16a34a">
                            Services Included
                        </h4>
                        <ul id="servicesincluded" class="list-none pl-0">
                            ${includedHtml}
                        </ul>
                    </div>

                    <!-- Right: Services Not Included (click-to-remove) -->
                    <div class="p-3" id="col-excluded">
                        <h4 class="text-[10px] font-bold uppercase mb-1" style="color:#f87171">
                            Services Not Included
                        </h4>
                        <ul id="servicesexcluded" class="list-none pl-0">
                            ${excludedHtml}
                        </ul>
                    </div>
                </div>
    `;
        }
    }

    // ---------- Plan F / AlaCarte merged single box ----------
    let description;
    if (typeof descriptionMap !== "undefined" && sub && descriptionMap[sub]) {
        description = descriptionMap[sub];
    } else if (isPlanF || isAlaCarte) {
        description = "Select a sub-service to view details.";
    } else {
        return "";
    }

    return `
    <div class="mt-4 grid grid-cols-1 gap-4">
        <div class="p-3 bg-white rounded border border-gray-200">
            <h4 class="text-[10px] font-bold uppercase mb-1" style="color:#002147">Service Details</h4>
            <p class="text-xs text-gray-600 whitespace-pre-wrap">${escapeHtml(description)}</p>
        </div>
        </div>
    `;
}

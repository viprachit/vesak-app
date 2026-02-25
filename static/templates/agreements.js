// ============================================================================
// AGREEMENTS & WARNING LETTERS
// ============================================================================

function buildNurseAgreementBody(data) {
    return `
    <div class="text-sm text-gray-700 space-y-4 leading-relaxed text-justify px-2">
        <h3 class="font-bold text-center underline mb-4" style="color:#002147">CONTRACT FOR NURSING SERVICES</h3>
        <p>This agreement is made between <b>Vesak Care Foundation</b> and <b>${escapeHtml(data.name)}</b>.</p>
        <p>The Nurse agrees to provide professional medical care including medication administration, vital monitoring, and patient hygiene as per the care plan <b>${escapeHtml(data.plan)}</b>.</p>
        <p><b>Terms:</b> Services will be rendered on a <b>${escapeHtml(data.shift)}</b> basis. Any misconduct or negligence will result in immediate termination.</p>
        
        <div class="mt-12 flex justify-between pt-8">
            <div class="text-center border-t border-gray-400 w-1/3 pt-2">Vesak Care Auth. Signatory</div>
            <div class="text-center border-t border-gray-400 w-1/3 pt-2">Nurse / Staff Signature</div>
        </div>
    </div>
    `;
}

function buildPatientAgreementBody(data) {
    return `
    <div class="text-sm text-gray-700 space-y-4 leading-relaxed text-justify px-2">
        <h3 class="font-bold text-center underline mb-4" style="color:#002147">PATIENT CARE SERVICE AGREEMENT</h3>
        <p>This agreement confirms the engagement of services for patient <b>${escapeHtml(data.name)}</b>.</p>
        <p><b>Scope:</b> Vesak Care Foundation will provide staff for <b>${escapeHtml(data.plan)}</b> (Shift: ${escapeHtml(data.shift)}).</p>
        <p><b>Payment Terms:</b> Payment is due in advance for the agreed period of <b>${data.paidQty} days/visits</b>.</p>
        <p><b>Liability:</b> The Foundation ensures background verification of staff but is not liable for personal valuables kept at the patient's home.</p>

        <div class="mt-12 flex justify-between pt-8">
            <div class="text-center border-t border-gray-400 w-1/3 pt-2">Vesak Care Auth. Signatory</div>
            <div class="text-center border-t border-gray-400 w-1/3 pt-2">Client Signature</div>
        </div>
    </div>
    `;
}

function buildWarningLetterBody(data) {
    return `
    <div class="text-sm text-gray-700 space-y-4 leading-relaxed px-2">
            <h3 class="font-bold text-center underline mb-4" style="color:#002147">WARNING LETTER</h3>
            
            <div class="text-right text-xs text-gray-600 mb-6">
                <p><b>Date:</b> ${data.date}</p>
                <p><b>Ref. No:</b> ${data.inv}</p>
            </div>
            
            <p><b>To,</b></p>
            <p><b>${escapeHtml(data.name)}</b></p>
            <p>${escapeHtml(data.address)}, ${escapeHtml(data.location)}</p>
            <p><b>Mobile:</b> ${escapeHtml(data.mobile)}</p>
            
            <p class="mt-4"><b>Subject: Warning Regarding Service Agreement Violation</b></p>
            
            <p class="mt-4">Dear ${escapeHtml(data.name)},</p>
            
            <p>This letter serves as an official warning regarding the services being provided under the agreement for <b>${escapeHtml(data.plan)}</b> (Shift: ${escapeHtml(data.shift)}).</p>
            
            <p>We have observed the following issues:</p>
            <ul class="list-disc pl-6 space-y-1">
                <li>Failure to comply with payment terms</li>
                <li>Violation of service conduct guidelines</li>
                <li>Breach of agreed-upon service protocols</li>
            </ul>
            
            <p>If these issues are not addressed within <b>7 working days</b> from the date of this letter, Vesak Care Foundation reserves the right to terminate the service agreement without any further notice.</p>
            
            <p>We request your immediate attention to this matter.</p>
            
            <p class="mt-6">Regards,</p>
            <p><b>Vesak Care Foundation</b></p>
            <p class="text-xs text-gray-600">Patient Care Services Division</p>
            
            <div class="mt-12 flex justify-between pt-8">
                <div class="text-center border-t border-gray-400 w-1/3 pt-2">Authorized Signatory</div>
                <div class="text-center border-t border-gray-400 w-1/3 pt-2">Acknowledgment</div>
            </div>
            
            <div class="mt-6 p-3 bg-red-50 border-l-4 border-red-500 text-xs">
                <p class="font-bold text-red-700">IMPORTANT NOTICE:</p>
                <p class="text-red-600">This is an official warning. Non-compliance may result in immediate service termination and legal action.</p>
            </div>
        </div>
    `;
}



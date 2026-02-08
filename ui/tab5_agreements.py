# ui/tab5_agreements.py
"""
Agreement HTML generators used by the Create Agreements tab.
Functions:
- generate_caregiver_agreement_html(master_row, tab_inputs, lang)
- generate_family_agreement_html(master_row, lang)
- generate_warning_letter_html(master_row, staff_name, violations, fine_amount)
"""

from i18n import AGREEMENT_I18N
from helpers_utils import construct_description_html, construct_amount_html
import datetime
import html

def _esc(s):
    return html.escape(str(s or ""))

def generate_caregiver_agreement_html(master_row: dict, tab_inputs: dict, lang: str = "English") -> str:
    """
    Build a caregiver agreement body using translations and filled fields.
    Returns full HTML string (with <body> contents).
    """
    i18n = AGREEMENT_I18N.get(lang, AGREEMENT_I18N["English"])
    today = datetime.date.today().strftime("%d-%b-%Y")
    caregiver = _esc(tab_inputs.get("nurse_name") or master_row.get("Nurse Name") or "")
    client = _esc(master_row.get("Customer Name") or master_row.get("Customer", ""))
    plan = _esc(master_row.get("Plan") or "")
    body = f"""
    <div>
        <h2 style="text-align:center">{i18n['title']}</h2>
        <h4 style="text-align:center">{i18n['subtitle']}</h4>
        <p>{i18n['agreement_made']} {i18n.get('agency_desc')}</p>
        <p><strong>{i18n['on_date']}</strong> {today}</p>

        <h3>{i18n['sec_1']}</h3>
        <p>{i18n['sec_1_1']}</p>

        <h3>{i18n['sec_2']}</h3>
        <p>{i18n['sec_2_intro']}</p>
        <ul>
    """
    # refusal list if present
    for item in i18n.get("refuse_list", []):
        body += f"<li>{_esc(item)}</li>"
    body += "</ul>"

    # Add some metadata table
    body += f"""
        <hr/>
        <table width="100%">
            <tr><td><strong>Client:</strong> {_esc(client)}</td><td><strong>Plan:</strong> {_esc(plan)}</td></tr>
            <tr><td><strong>Caregiver:</strong> {_esc(caregiver)}</td><td><strong>Date:</strong> {today}</td></tr>
        </table>
        <br/>
        <p>{i18n.get('sec_3','')}</p>
        <p>{i18n.get('sec_3_1','')}</p>
        <p>{i18n.get('sec_3_2','')}</p>
    """
    # Signature block
    body += f"""
        <br/><br/>
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div style="text-align:center">
                _______________________<br/>
                {i18n.get('sign_caregiver')}
            </div>
            <div style="text-align:center">
                _______________________<br/>
                {i18n.get('sign_auth')}
            </div>
        </div>
    </div>
    """
    return body

def generate_family_agreement_html(master_row: dict, lang: str = "English") -> str:
    i18n = AGREEMENT_I18N.get(lang, AGREEMENT_I18N["English"])
    client_name = _esc(master_row.get("Customer Name", ""))
    plan = _esc(master_row.get("Plan", ""))
    date = datetime.date.today().strftime("%d-%b-%Y")
    body = f"""
    <div>
      <h2 style="text-align:center">{i18n.get('title','CLIENT / FAMILY AGREEMENT')}</h2>
      <p><strong>Client: </strong>{client_name}</p>
      <p><strong>Plan: </strong>{plan}</p>
      <p>This Client / Family Agreement outlines the mutual expectations and payment terms for services provided by Vesak Care Foundation. By signing below, the client/family agrees to cooperate with the caregiver and the Agency as per standards described in the caregiver agreement.</p>
      <br/>
      <div style="display:flex;justify-content:space-between;margin-top:40px;">
          <div style="text-align:center">
              _______________________<br/>
              Client / Family
          </div>
          <div style="text-align:center">
              _______________________<br/>
              Authorized Signatory, Vesak Care
          </div>
      </div>
    </div>
    """
    return body

def generate_warning_letter_html(master_row: dict, staff_name: str, violations: list, fine_amount: str = "0") -> str:
    client = _esc(master_row.get("Customer Name", ""))
    inv = _esc(master_row.get("Invoice Number", ""))
    date = datetime.date.today().strftime("%d-%b-%Y")
    viol_html = "".join(f"<li>{_esc(v)}</li>" for v in (violations or []))
    body = f"""
    <div>
        <h3 style="text-align:center">Warning Letter</h3>
        <p>Date: {date}</p>
        <p>To: { _esc(staff_name) }</p>
        <p>Ref: Invoice {inv} / Client: {client}</p>
        <p>The following violations were observed:</p>
        <ul>{viol_html}</ul>
        <p>Fine Amount (if any): Rs. {_esc(fine_amount)}</p>
        <p>Please consider this a formal warning. Continued violations may lead to termination or legal action as per the agreement.</p>
        <br/>
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div style="text-align:center">_______________________<br/>Authorized Signatory</div>
            <div style="text-align:center">_______________________<br/>Employee Signature</div>
        </div>
    </div>
    """
    return body

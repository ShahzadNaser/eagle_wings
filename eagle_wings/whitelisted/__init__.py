from __future__ import unicode_literals
import frappe

@frappe.whitelist()
def get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True):
    from erpnext.stock.get_item_details import get_item_details, process_args
    out = get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True)
    args = process_args(args)
    if args.get("doctype") in ["Quotation"]:
       out["last_purchase_rate"] = frappe.db.get_value("Item",args.get("item_code"),"last_purchase_rate") or 0 

    return out
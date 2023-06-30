from __future__ import unicode_literals
import frappe

@frappe.whitelist()
def get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True):
    from erpnext.stock.get_item_details import get_item_details, process_args
    out = get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True)
    args = process_args(args)
    if args.get("doctype") in ["Quotation"]:
       out["last_purchase_rate"] = frappe.db.get_value("Item Price",{"item_code":args.get("item_code"),"price_list":"Standard Buying"},"price_list_rate") or 0 

    return out
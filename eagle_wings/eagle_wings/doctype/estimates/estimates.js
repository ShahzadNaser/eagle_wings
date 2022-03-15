// Copyright (c) 2022, Shahzad Naser and contributors
// For license information, please see license.txt

frappe.ui.form.on('Estimates', {
	refresh: function(frm) {

	},
	default_price_list: function(frm){
		var args = frm.events._get_args(frm.doc.items);
		console.log("=========price_list_rate===============");
		if (!((args.items && args.items.length) || args.defualt_price_list)) {
			return;
		}
		return frm.call({
			method: "erpnext.stock.get_item_details.apply_price_list",
			args: {	args: args },
			callback: function(r) {
				if (!r.exc) {
					frappe.run_serially([
						() => frm.set_value("currency", r.message.parent.price_list_currency),
						() => frm.set_value("conversion_rate", r.message.parent.plc_conversion_rate),
						() => {
							if(args.items.length) {
								frm.events.set_values_for_item_list(r.message.children);
							}
						}
					]);
				}
			}
		});

	},
	set_values_for_item_list: function(children) {
		console.log(children);
		var price_list_rate_changed = false;

		for(var i=0, l=children.length; i<l; i++) {
			var d = children[i];
			console.log(d);
			for(var k in d) {
				var v = d[k];
				if (["doctype", "name"].indexOf(k)===-1) {
					if(k=="price_list_rate") {
						if(flt(v) != flt(d.price_list_rate)) price_list_rate_changed = true;
						frappe.model.set_value(d.doctype, d.name, "price_list_rate", flt(d.price_list_rate));
						frappe.model.set_value(d.doctype, d.name, "rate", flt(d.price_list_rate));
					}
				}

			}
		}

		if(!price_list_rate_changed) cur_frm.trigger("calculate_totals");
	},
	calculate_totals: function(frm){
		let totals = {
			"total":0,
			"total_qty":0,
			"sub_total":0,
			"markup":0,
		};
		frm.doc.items.forEach(function(item){
			totals.sub_total = totals.sub_total + item.base_amount;
			totals.markup = totals.markup + item.gross_profit;
			totals.total_qty = totals.total_qty + item.qty;
			totals.total = totals.total + item.total_amount;
		});
		frm.set_value("sub_total",totals.sub_total);
		frm.set_value("markup",totals.markup);
		frm.set_value("total_qty",totals.total_qty);
		frm.set_value("total",totals.total);
		frm.refresh_fields();
	},
	_get_args: function(items) {
		return {
			"items": items,
			"customer": cur_frm.doc.customer || cur_frm.doc.party_name,
			"quotation_to": cur_frm.doc.customer,
			"customer_group": cur_frm.doc.customer_group,
			"territory": cur_frm.doc.territory,
			"supplier": cur_frm.doc.supplier,
			"supplier_group": cur_frm.doc.supplier_group,
			"currency": cur_frm.doc.currency,
			"conversion_rate": cur_frm.doc.conversion_rate,
			"price_list": cur_frm.doc.default_price_list || cur_frm.doc.buying_price_list,
			"price_list_currency": cur_frm.doc.price_list_currency,
			"plc_conversion_rate": cur_frm.doc.plc_conversion_rate,
			"company": cur_frm.doc.company,
			"transaction_date": cur_frm.doc.transaction_date || cur_frm.doc.posting_date,
			"campaign": cur_frm.doc.campaign,
			"sales_partner": cur_frm.doc.sales_partner,
			"ignore_pricing_rule": cur_frm.doc.ignore_pricing_rule,
			"doctype": cur_frm.doc.doctype,
			"name": cur_frm.doc.name,
			"is_return": cint(cur_frm.doc.is_return),
			"update_stock": in_list(['Sales Invoice', 'Purchase Invoice'], cur_frm.doc.doctype) ? cint(cur_frm.doc.update_stock) : 0,
			"conversion_factor": cur_frm.doc.conversion_factor,
			"pos_profile": cur_frm.doc.doctype == 'Sales Invoice' ? cur_frm.doc.pos_profile : '',
			"coupon_code": cur_frm.doc.coupon_code
		};
	},
	calculate_items_total: function(item, margin=false){
		if(margin){
			if(item.margin_type == "Amount"){
				item.rate = flt(item.valuation_rate) + flt(item.margin)
			}else{
				item.rate = flt(item.valuation_rate) + flt((item.valuation_rate/100)*item.margin)
			}
			margin = true;
		}
	
		item.total_amount = flt(flt(item.rate)*flt(item.qty));
		item.base_amount = flt(flt(item.valuation_rate)*flt(item.qty));
		item.gross_profit = item.total_amount - item.base_amount;
	
		if(!margin){
			if(item.margin_type == "Amount"){
				item.margin = flt(item.rate - item.valuation_rate);
			}else{
				item.margin = flt(item.base_amount/item.total_amount)*100;
			}
		}
		cur_frm.refresh_fields("items");
	}
	
});

frappe.ui.form.on('Estimates Item', {
	item_code: function(frm, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		item.weight_per_unit = 0;
		item.weight_uom = '';

		if(item.item_code) {
			return frm.call({
				method: "erpnext.stock.get_item_details.get_item_details",
				child: item,
				args: {
					doc: cur_frm.doc,
					args: {
						item_code: item.item_code,
						warehouse: item.warehouse || "",
						customer: cur_frm.doc.customer,
						quotation_to: cur_frm.doc.customer,
						currency: "BHD",
						update_stock: cint(1),
						conversion_rate: 1,
						price_list: cur_frm.doc.default_price_list,
						price_list_currency: "BHD" || cur_frm.doc.price_list_currency,
						plc_conversion_rate: 1 || cur_frm.doc.plc_conversion_rate,
						company: cur_frm.doc.company,
						is_pos: cint(0),
						is_return: cint(0),
						transaction_date: cur_frm.doc.posting_date,
						ignore_pricing_rule: cint(1),
						doctype: cur_frm.doc.doctype,
						name: cur_frm.doc.name,
						qty: item.qty || 1,
						net_rate: item.rate,
						stock_qty: item.stock_qty,
						conversion_factor: item.conversion_factor,
						weight_per_unit: item.weight_per_unit,
						weight_uom: item.weight_uom,
						stock_uom: item.stock_uom,
						pos_profile: '',
						child_docname: item.name
					}
				},

				callback: function(r) {
					console.log(r);
					if(!r.exc) {
						frappe.run_serially([
							() => {
								item.rate = r.message.price_list_rate;		
								item.valuation_rate = r.message.valuation_rate;		
								item.qty = r.message.qty;
								frm.refresh_field("items");
							},
							() => {
								frm.trigger("calculate_totals");
							}

						]);
					}
				}
			});		
		}
	},
	qty:function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item)
			},
			() => {
				frm.trigger("calculate_totals");
			}

		]);
	},
	rate:function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item, false)
			},
			() => {
				frm.trigger("calculate_totals");
			}

		]);
	},
	margin:function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item, true)
			},
			() => {
				frm.trigger("calculate_totals");
			}

		]);
	},
	margin_type:function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item, true)
			},
			() => {
				frm.trigger("calculate_totals");
			}

		]);
	}
});
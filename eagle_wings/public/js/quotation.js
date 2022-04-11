frappe.ui.form.on('Quotation', {
	calculate_items_total: function(item, margin=false){
		if(margin){
			if(item.margin_typ == "Amount"){
				item.rate = flt(item.cost) + flt(item.margin)
			}else{
				item.rate = flt(item.cost) + flt((item.cost/100)*item.margin)
			}
		}else{
			if(item.margin_typ == "Amount"){
				item.margin = flt(item.rate - item.cost);
			}else{
				item.margin = flt(item.base_amount_custom/item.total_amount)*100;
			}
		}
	
		item.total_amount = flt(flt(item.rate)*flt(item.qty));
		item.base_amount_custom = flt(flt(item.cost)*flt(item.qty));
		item.gross_profit_custom = item.total_amount - item.base_amount_custom;
		item.amount = flt(flt(item.rate)*flt(item.qty));
		
		cur_frm.refresh_fields("items");
	},
	calculate_totals: function(frm){
		let totals = {
			"total":0,
			"total_qty":0,
			"sub_total":0,
			"markup":0,
			"markup_p":0,
		};
		frm.doc.items.forEach(function(item){
			totals.sub_total = totals.sub_total + item.base_amount_custom;
			totals.markup = totals.markup + item.gross_profit_custom;
			totals.total_qty = totals.total_qty + item.qty;
			totals.total = totals.total + item.amount;			
		});
		totals.markup_p = flt(totals.markup/totals.total)*100;
		frm.set_value("sub_total",totals.sub_total);
		frm.set_value("markup_amount",totals.markup);
		frm.set_value("margin_percent",totals.markup_p);
		// frm.set_value("total",totals.total);
		frm.refresh_fields();
	},
	before_save: function(frm){
		frm.trigger("calculate_totals");
	}
});

frappe.ui.form.on("Quotation Item",{
	item_code:function(frm, cdt, cdn){
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
				// frm.trigger("calculate_totals");
			}

		]);
	},
	cost:function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item, false)
			},
			() => {
				// frm.trigger("calculate_totals");
			}

		]);
	},
	price_list_rate: function(frm, cdt, cdn){
		var item = frappe.get_doc(cdt, cdn);
		item.cost = item.valuation_rate;
		frappe.run_serially([
			() => {
				frm.events.calculate_items_total(item)
			},
			() => {
				frm.trigger("calculate_totals");
			}
		]);
	}
});
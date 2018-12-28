sap.ui.define([
		"sap/m/ComboBox",
		"sap/ui/core/SeparatorItem"
	],
	function (oComboBox, SeparatorItem) {
		"use strict";
		var ComboBox = oComboBox.extend("sap.ui.demo.worklist.controller.ArvatoComboBox", {
				metadata: {
					properties: {
					}
				},
				renderer: {
				}
			}
		);

		ComboBox.prototype.addItemGroup = function (oGroup, oHeader, bSuppressInvalidate) {
			oHeader = oHeader || new SeparatorItem({
				text: oGroup.text || oGroup.key
			});

			this.addAggregation("items", oHeader, bSuppressInvalidate);
			return oHeader;
		};
		
		return ComboBox;
	});
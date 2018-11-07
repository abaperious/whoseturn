sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/Item',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/odata/v2/ODataModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/MessageToast',
    'jquery.sap.global'
], function(Controller, Item, JSONModel, ODataModel, Filter, FilterOperator, MessageToast, q) {
    "use strict";
    return Controller.extend("sap.ui.demo.whoseturn.controller.Test", { 
        
        onInit: function() {
        	var oView = this.getView();
        	var that = this;
        	
            console.log('onInit');     
            
            
            this.getView().setModel(new JSONModel({
            	Products: []
            }), "frontEnd");

            
                
            
//            this._router = this.getOwnerComponent().getRouter();
//            this._router.getRoute("reprint").attachPatternMatched(this._onRouteMatched, this);

//            oView.addDependent(sap.ui.xmlfragment(oView.getId(), "arvato.tm.labelEngine.view.fragment.batchProcessing.ProcessDialog", this));
//            oView.addDependent(sap.ui.xmlfragment(oView.getId(), "arvato.tm.labelEngine.view.fragment.batchProcessing.ProcessMessageDialog", this));


        },
        
     
//        onNavBack: function(oEvt) {
//            if (sap.ui.core.routing.History.getInstance().getPreviousHash() !== undefined) {
//                window.history.go(-1);
//            } else {
//                this._router.navTo("home");
//            }
//        },
//        _onRouteMatched: function(oEvt) {
//	        var oBackEnd = this.getView().getModel("backEnd");
//	        var oFrontEnd = this.getView().getModel("frontEnd").getData();
//            var that = this;
//
//            this._sAppKey = oEvt.getParameter("arguments").appKey;
//            this._sConfKey = oEvt.getParameter("arguments").configKey;
//
//            sap.ui.core.BusyIndicator.hide();   
//            return;
//        },

    });
});
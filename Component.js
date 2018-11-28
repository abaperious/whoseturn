/* global document */
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/demo/worklist/model/models",
	"sap/ui/demo/worklist/controller/ErrorHandler"
], function (UIComponent, Device, models, ErrorHandler) {
	"use strict";
	var db = null;
	return UIComponent.extend("sap.ui.demo.worklist.Component", {
		
		metadata: {
			manifest: "json"
		},

		getDb : function(){
			return db;
		},
		

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this function, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			this.initializeFireStore();


			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy: function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		initializeFireStore: function () {
            // Initialize Firebase
            var config = {
                apiKey: "AIzaSyDgVzdV4FGtl0q4x3Q9MkEePLOEZ7PwSMo",
                authDomain: "whoseturn-98db0.firebaseapp.com",
                projectId: "whoseturn-98db0",
            };
            firebase.initializeApp(config);
            // Initialize Cloud Firestore through Firebase
            db = firebase.firestore();

            // Disable deprecated features
            db.settings({
                timestampsInSnapshots: true
            });


            db.collection("users").get().then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    console.log(`${doc.id} => ${doc.data()}`);
                });
            });

            db.collection("users").get().then(function (doc) {
                for (let index = 0; index < doc.docs.length; index++) {
                    var element = doc.docs[index];
                    console.log(element.data().name);
                }
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });

        }

	});

}
);
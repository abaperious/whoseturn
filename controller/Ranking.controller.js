/*global location history */
sap.ui.define([
    "sap/ui/demo/worklist/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/demo/worklist/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
    "use strict";
    var db;
    return BaseController.extend("sap.ui.demo.worklist.controller.TodaysQueue", {

        formatter: formatter,


        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the TodayQueue controller is instantiated.
         * @public
         */
        onInit: function () {
            var oViewModel,
                iOriginalBusyDelay,
                oTable = this.byId("table");

            // Put down worklist table's original value for busy indicator delay,
            // so it can be restored later on. Busy handling on the table is
            // taken care of by the table itself.
            // iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
            // keeps the search state
            this._aTableSearchState = [];

            // Model used to manipulate control states
            oViewModel = new JSONModel({
                worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
                shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
                shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
                shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusyDelay: 0
            });
            this.setModel(oViewModel, "worklistView");
            this.initializeFireStore();
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.loadData("localService/mockdata/Queue1People.json", '', false);
            var oDate = new Date();
            var users = [];
            oModel.setProperty("/currentDate", oDate);
            oModel.setProperty("/users", users);
            this.setModel(oModel, 'backEnd');

            var oMenuModel = new sap.ui.model.json.JSONModel();
            var menuData = { navigation: [{
                    title: 'Todays queue',
                    icon: 'sap-icon://employee',
                    expanded: true,
                    key: 'todaysQueue'
                },
                {
                    title: 'Ranking',
                    icon: 'sap-icon://sorting-ranking',
                    expanded: true,
                    key: 'ranking'
                },
                {
                    title: 'Calendar',
                    icon: 'sap-icon://appointment-2',
                    expanded: true,
                    key: 'calendar'
                }
            ]};
            oMenuModel.setData(menuData);
            this.setModel(oMenuModel, 'menu');
            this.getUsers();
            this.getTrips();
        },
        getUsers: function () {
            var users = [];
            var that = this;
            db.collection("users").get().then(function (doc) {
                for (let index = 0; index < doc.docs.length; index++) {
                    var element = doc.docs[index];
                    var user = element.data();
                    user.vsRating = [];
                    users.push(user);
                    console.log(element.data().name);

                }
                that.getModel('backEnd').setProperty("/users", users);
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });

        },
        getTrips: function () {
            var trips = [];
            var that = this;
            

            db.collection("trips").get().then(function (doc) {
                var named_users = that.getModel('backEnd').getProperty("/users");
                for (let index = 0; index < doc.docs.length; index++) {
                    var element = doc.docs[index];
                    var trip = {
                        date: element.data().date,
                        travelers: element.data().travelers
                    };
                    if (trip.travelers.length > 1) {
                        for (let index = 0; index < named_users.length; index++) {
                            var named_user = named_users[index];
                            trip.travelers.find((o,i)=>{
                                if (o.id.path == named_user.id.path) {
                                    var toAdd = (o.oneWay == true) ? 0.5 : 1;
                                    named_user.travelingScore = (named_user.travelingScore == undefined) ? 1 : named_user.travelingScore+toAdd;
                                    if (o.isDriving == true && trip.travelers.length == named_users.length) {
                                        named_user.drivingScore = (named_user.drivingScore == undefined) ? 1 : named_user.drivingScore+toAdd;
                                    } else if (o.isDriving == true)  {
                                        trip.travelers.find((o2,j)=>{
                                            if (o2.id.path != named_user.id.path) {
                                                var toAddVs = (o2.oneWay == true) ? 0.5 : 1;
                                                var vsUserIndex = named_user.vsRating.findIndex(x=>x.name == o2.id.path );
                                                if (vsUserIndex === -1) {
                                                    named_user.vsRating.push({
                                                        name: o2.id.path,
                                                        score: toAddVs
                                                    });
                                                } else {
                                                    named_user.vsRating[vsUserIndex].score+=toAddVs;
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                    
                    trips.push(trip);
                    console.log(element.data().name);

                }
                // calculate points
                that.getModel('backEnd').setProperty("/users", named_users);
                that.getModel('backEnd').setProperty("/trips", trips);
                named_users.forEach(o => { o.id = o.id.path;
                    
                });
                console.log(named_users);
                that.getModel('backEnd').setProperty("/rankingText", JSON.stringify(named_users, null,2));
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });

        },
        initializeFireStore: function () {
            // Initialize Firebase
            // var config = {
            //     apiKey: "AIzaSyDgVzdV4FGtl0q4x3Q9MkEePLOEZ7PwSMo",
            //     authDomain: "whoseturn-98db0.firebaseapp.com",
            //     projectId: "whoseturn-98db0",
            // };
            // firebase.initializeApp(config);
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

        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
            }
            this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
        },

        /**
         * Event handler when a table item gets pressed
         * @param {sap.ui.base.Event} oEvent the table selectionChange event
         * @public
         */
        onPress: function (oEvent) {
            // The source is the list item that got pressed
            this._showObject(oEvent.getSource());
        },

        /**
         * Event handler for navigating back.
         * We navigate back in the browser historz
         * @public
         */
        onNavBack: function () {
            history.go(-1);
        },


        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any master list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var sQuery = oEvent.getParameter("query");

                if (sQuery && sQuery.length > 0) {
                    aTableSearchState = [new Filter("Name", FilterOperator.Contains, sQuery)];
                }
                this._applySearch(aTableSearchState);
            }

        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Shows the selected item on the object page
         * On phones a additional history entry is created
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showObject: function (oItem) {
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext("backEnd2").getProperty("ObjectID")
            });
        },

        onSubmitPress: function (oEvent) {
            var users = this.getView().getModel("backEnd").getData().users;

            var trip = {
                date: new Date().toJSON(),
                travelers: []
            };

            for (let index = 0; index < users.length; index++) {
                if (users[index].isTraveling == true) {
                    var user = {
                        "id": users[index].id,
                        "isDriving": (users[index].isDriving == undefined) ? false : true,
                        "oneWay": false,
                        "lastState": ""
                    }
                    trip.travelers.push(user);
                    console.log(trip);
                }

            }

            db.collection("trips").add(trip).then(function () {
                console.log("Document successfully written!");
            });
        },

        onTravelingClick: function (oEvent) {
            var user = oEvent.getSource().getBindingContext("backEnd");
            if (user.getProperty("isTraveling")==false) {
                if (user.getProperty("lastState")=="selected") {
                    oEvent.getSource().setProperty("partiallySelected",true);
                    oEvent.getSource().setProperty("selected",true);
                    this.getView().getModel("backEnd").setProperty(user.sPath+"/lastState", "partiallySelected");
                    oEvent.getSource().setText("One Way")
                }
            } else {
                oEvent.getSource().setText("");
                if (user.getProperty("lastState")=="partiallySelected") {
                    this.getView().getModel("backEnd").setProperty(user.sPath+"/lastState", "");
                    oEvent.getSource().setProperty("selected",false);
                } else {
                    this.getView().getModel("backEnd").setProperty(user.sPath+"/lastState", "selected");
                }
                
            }
        },
        onSideNavButtonPress : function() {
			var viewId = this.getView().getId();
			var toolPage = sap.ui.getCore().byId(viewId + "--toolPage");
			var sideExpanded = toolPage.getSideExpanded();

			// this._setToggleButtonTooltip(sideExpanded);

			toolPage.setSideExpanded(!toolPage.getSideExpanded());
        },
        onItemSelect : function (oItem) {
            this.getRouter().navTo(oItem.getParameter('item').getKey());
        }

    });
}
);
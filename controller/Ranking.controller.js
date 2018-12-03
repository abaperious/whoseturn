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
    var namesOnGraph = [];
    var versusOnGraph = [];
    var drivingOnGraph = [];
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
            db = this.getOwnerComponent().getDb();
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.loadData("localService/mockdata/Queue1People.json", '', false);
            var oDate = new Date();
            var users = [];
            oModel.setProperty("/currentDate", oDate);
            oModel.setProperty("/users", users);
            this.setModel(oModel, 'backEnd');

           
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
                    user.actualDrivingScore = 0;
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
                            trip.travelers.find((o, i) => {
                                if (o.id.path == named_user.id.path) {
                                    var toAdd = (o.oneWay == true) ? 0.5 : 1;
                                    named_user.travelingScore = (named_user.travelingScore == undefined) ? toAdd : named_user.travelingScore + toAdd;
                                    if (o.isDriving == true && trip.travelers.length == named_users.length) {
                                        named_user.drivingScore = (named_user.drivingScore == undefined) ? toAdd : named_user.drivingScore + toAdd;
                                    } else if (o.isDriving == true) {
                                        trip.travelers.find((o2, j) => {
                                            if (o2.id.path != named_user.id.path) {
                                                var toAddVs = (o2.oneWay == true) ? 0.5 : 1;
                                                var vsUserIndex = named_user.vsRating.findIndex(x => x.name == o2.id.path);
                                                if (vsUserIndex === -1) {
                                                    named_user.vsRating.push({
                                                        name: o2.id.path,
                                                        score: toAddVs
                                                    });
                                                } else {
                                                    named_user.vsRating[vsUserIndex].score += toAddVs;
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                            named_user.actualDrivingScore = named_user.drivingScore;
                        }
                    }

                    trips.push(trip);
                    console.log(element.data().name);

                }
                // calculate points
                that.getModel('backEnd').setProperty("/users", named_users);
                that.getModel('backEnd').setProperty("/trips", trips);
                named_users.forEach(o => {
                    o.id = o.id.path;

                });


                for (let index = 0; index < named_users.length; index++) {
                    var user = named_users[index];
                    user.scoreFromVS = 0;
                    
                    if (user.vsRating != undefined) {
                        for (let j = 0; j < user.vsRating.length; j++) {
                            const vsRat = user.vsRating[j];
                            user.scoreFromVS += vsRat.score;

                            named_users.find((o, i) => {
                                if (o.id == vsRat.name) {
                                    named_users[i].actualDrivingScore -= vsRat.score;
                                }
                            });
                        }
                    }
                    named_users[index] = user;
                }
                for (let index = 0; index < named_users.length; index++) {
                    var user = named_users[index];
                    namesOnGraph.push(user.name);
                    drivingOnGraph.push(user.actualDrivingScore);
                    versusOnGraph.push(user.scoreFromVS);
                }


                console.log(named_users);
                that.showGraph();

                that.getModel('backEnd').setProperty("/rankingText", JSON.stringify(named_users, null, 2));
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

        showGraph: function () {

            var ctx = $("#" + this.getView().getId() + "--myChart" + "")[0].getContext('2d');
            var myChart = new Chart(ctx, {
                type: 'horizontalBar',
                data: {
                    labels: namesOnGraph,
                    datasets: [{
                        label: 'Drived',
                        data: drivingOnGraph,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(255, 99, 132, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255,99,132,1)',
                            'rgba(255,99,132,1)',
                            'rgba(255,99,132,1)'
                        ],
                        borderWidth: 1
                    },
                    {
                        label: 'VS Score',
                        data: versusOnGraph,
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(75, 192, 192, 0.2)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            stacked: true,
                            ticks: {
                                beginAtZero: true
                            }
                        }],
                        yAxes: [{
                            stacked: true
                        }]
                    }
                }
            });
        }

    });
}
);
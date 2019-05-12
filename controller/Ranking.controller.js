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

            var oTabContainer = this.getView().byId("myTabContainer");
            oTabContainer.addEventDelegate({
                onAfterRendering: function () {
                    var oTabStrip = this.getAggregation("_tabStrip");
                    var oItems = oTabStrip.getItems();
                    for (var i = 0; i < oItems.length; i++) {
                        var oCloseButton = oItems[i].getAggregation("_closeButton");
                        oCloseButton.setVisible(false);
                    }
                }
            }, oTabContainer);
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
        check_and_split: function (trips) {
            for (let index = 0; index < trips.length; index++) {

                var trip = trips[index];
                var hasOneWay = false;
                var hasBothWays = false;

                trip.travelers.find((o, i) => {
                    if (o.oneWay == true) {
                        hasOneWay = true;
                    } else if (o.oneWay == false) {
                        hasBothWays = true;
                    }
                });
                if (hasOneWay && hasBothWays) {
                    //we split into 2 trips
                    var splittedTrip = {};
                    splittedTrip.date = "" + trip.date;
                    splittedTrip.travelers = [];
                    trip.travelers.find((o, i) => {
                        if (o.oneWay == false) {
                            trip.travelers[i].oneWay = true;
                            splittedTrip.travelers.push(trip.travelers[i]);
                        }
                    });
                    trips.push(splittedTrip);
                }
            }
            return trips;
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
                        travelers: element.data().travelers.sort(function (a, b) {
                            return a.id.path < b.id.path ? -1 : 1;
                        })
                    };

                    trips.push(trip);
                    console.log(element.data().name);

                }
                that.check_and_split(trips);

                trips.sort(function (a, b) {
                    if (a.date > b.date) { return 1; } return -1;
                });
                // to delete trips with magda
                // trips.splice(38);
                // temporary get rid of artur
                // trips = trips.filter(function (item) {
                //     return item.date <= "2019-02-12";
                // });

                // named_users = named_users.filter(function(item){
                //     return item.id.path != 'users/4'
                // });



                // calculate points
                that.getModel('backEnd').setProperty("/users", named_users);
                that.getModel('backEnd').setProperty("/trips", trips);
                named_users.forEach(o => {
                    o.id = o.id.path;
                    o.actualDrivingScore = 0;
                });

                console.log(named_users);
                // that.showGraph();
                that.build_queues(trips);
                // that.getModel('backEnd').setProperty("/rankingText", JSON.stringify(named_users, null, 2));
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });

        },
        build_queues: function (trips) {
            var queues = [];
            trips.forEach(trip => {
                if (trip.travelers.length > 1) {
                    trip.hash=trip.travelers.map((x)=>x.id.path).reduce((x,y,idx)=>
                        idx == 0 ? y : x + ', ' + y);
                    console.log(trip.hash);
                    var queue = queues.find((o, i) => {
                        if (o.size == trip.travelers.length) {
                            return o;
                        }
                    });
                    if (queue == undefined) {
                        queues.push({
                            name: '' + trip.travelers.length + '\'s queue',
                            size: trip.travelers.length,
                            subQueue: [{ hash: trip.hash, people: trip.travelers }]
                        });
                    } else {
                        var existingSubQueue = queue.subQueue.find((o, i) => {
                            if (o.hash == trip.hash) {
                                // add points
                                return o;
                            }
                        });
                        if (existingSubQueue == undefined) {
                            queue.subQueue.push({hash:trip.hash, people: trip.travelers});
                        }
                    }
                }
            });


            this.getModel('backEnd').setProperty("/queues", queues);
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
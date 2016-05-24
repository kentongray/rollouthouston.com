define("GeoLocation", ["exports"], function (exports) {
    "use strict";

    var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    /**
     * Handles getting location data from street address or coordinates
     **/

    var GeoLocation = exports.GeoLocation = (function () {
        function GeoLocation($http, $q) {
            _classCallCheck(this, GeoLocation);

            this.$http = $http;
            this.$q = $q;
        }

        _createClass(GeoLocation, {
            lookupCoordinates: {
                value: function lookupCoordinates(suggestion) {
                    if (!suggestion) {
                        return this.$q.reject();
                    }
                    return this.$http.get("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?&Address=" + suggestion.text + "&State=TX&f=json&City=Houston&maxLocations=10&maxResultSize=1&outFields=StreetType&magicKey=" + suggestion.magicKey + "&category=&location=-95.3632700,29.7632800&distance=10000&f=pjson").then(function (r) {
                        console.log(r);return r.data.candidates[0].location;
                    });
                }
            },
            lookupAddress: {
                value: function lookupAddress(address) {
                    //http://mycity.houstontx.gov/ArcGIS10/rest/services/addresslocators/COH_COMPOSITE_LOCATOR_WM/GeocodeServer/findAddressCandidates?&Address=1904%20Oakdale&State=TX&f=json&City=Houston&maxLocations=10&maxResultSize=1&outFields=StreetType
                    //http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=oakdale&category=&location=-95.3632700,29.7632800&distance=10000&f=pjson
                    return this.$http.get("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=" + address + "&category=&location=-95.3632700,29.7632800&distance=10000&f=pjson").then(function (r) {
                        return r.data.suggestions;
                    });
                }
            }
        });

        return GeoLocation;
    })();
});
define("Scheduler", ["exports"], function (exports) {
    "use strict";

    var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

    var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    /**
     *
     * Handles pickup schedules for Houston.
     * TODO: Abstract to more generic schedule based system (cron?) and abstract Houston data to adapter allow easy addition of more regions
     *
     * Example "API" calls for citymap
     trash
     http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/111/query?geometryType=esriGeometryPoint&f=json&outSR=102100&outFields=DAY%2CQUAD&geometry=%7B%22x%22%3A%2D10617688%2E9548%2C%22y%22%3A3467985%2E443099998%7D&spatialRel=esriSpatialRelIntersects&returnGeometry=false
     heavy/junk
     http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/112/query?geometryType=esriGeometryPoint&f=json&outSR=102100&outFields=SERVICE%5FDA%2CQUAD&geometry=%7B%22x%22%3A%2D10617688%2E9548%2C%22y%22%3A3467985%2E443099998%7D&spatialRel=esriSpatialRelIntersects&returnGeometry=false
     recycling
     http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/113/query?geometryType=esriGeometryPoint&f=json&outSR=102100&outFields=SERVICE%5FDAY%2CQUAD&geometry=%7B%22x%22%3A%2D10617688%2E9548%2C%22y%22%3A3467985%2E443099998%7D&spatialRel=esriSpatialRelIntersects&returnGeometry=false
    
     **/

    var Scheduler = exports.Scheduler = (function () {
        function Scheduler($http, $q, pos) {
            var _this = this;

            var numberOfDays = arguments[3] === undefined ? 60 : arguments[3];

            _classCallCheck(this, Scheduler);

            this.numberOfDays = numberOfDays;
            this.pickupDays = {};
            //an array of moment dates that may have disrupted schedules
            this.holidays = ["2015-11-11", "2015-11-12", "2015-11-27", "2015-11-28", "2015-12-24", "2015-12-25", "2015-12-26", "2015-1-1", "2015-1-2"].map(function (d) {
                return moment(d);
            });

            if (pos.coords) {
                this.pos = { y: pos.coords.latitude, x: pos.coords.longitude, spatialReference: { wkid: 4326 } };
            } else if (pos.x && pos.y) {
                this.pos = { x: pos.x, y: pos.y, spatialReference: { wkid: 4326 } };
            }

            var queryParams = {
                params: {
                    geometryType: "esriGeometryPoint",
                    f: "json", outSR: 102100, outFields: encodeURIComponent("DAY,QUAD,SERVICE_DA,SERVICE_DAY"),
                    geometry: JSON.stringify(this.pos),
                    spatialRel: "esriSpatialRelIntersects", returnGeometry: false
                }
            };
            var wastePromise = $http.get("http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/111/query", queryParams);
            var junkPromise = $http.get("http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/112/query", queryParams);
            var recyclingPromise = $http.get("http://mycity.houstontx.gov/ArcGIS10/rest/services/wm/MyCityMapData_wm/MapServer/113/query", queryParams);

            this.whenLoaded = $q.all([wastePromise, junkPromise, recyclingPromise]).then(function (allResults) {
                var _allResults$map = allResults.map(function (_) {
                    return _.data;
                });

                var _allResults$map2 = _slicedToArray(_allResults$map, 3);

                var wasteData = _allResults$map2[0];
                var junkData = _allResults$map2[1];
                var recyclingData = _allResults$map2[2];

                _this.configure(wasteData, junkData, recyclingData);
            });
        }

        _createClass(Scheduler, {
            configure: {
                value: function configure(wasteData, junkData, recyclingData) {
                    //waste is one day a week
                    var wasteDay = -1;
                    if (this.isValidData(wasteData)) {
                        wasteDay = Scheduler.getDayIndex(wasteData.features[0].attributes.DAY);
                    }

                    //heavy trash pickup is in the form of #rd WEEKDAY
                    var junkWeekOfMonth = -1;
                    var junkDay = -1;
                    if (this.isValidData(junkData)) {
                        var junkPattern = junkData.features[0].attributes.SERVICE_DA;
                        junkWeekOfMonth = junkPattern.substr(0, 1);
                        junkDay = Scheduler.getDayIndex(junkPattern.substr(junkPattern.indexOf(" ")));
                    }

                    //recycling pickup is alternating weeks
                    var recyclingDay = -1;
                    var recyclingScheduleA = false;
                    if (this.isValidData(recyclingData)) {
                        var recyclingSchedule = recyclingData.features[0].attributes.SERVICE_DAY;
                        recyclingDay = Scheduler.getDayIndex(recyclingSchedule.split("-")[0]);
                        //if true it is the "first week", if false it is the second week
                        recyclingScheduleA = recyclingSchedule.includes("-A");
                    }

                    this.pickupDays = { wasteDay: wasteDay, junkWeekOfMonth: junkWeekOfMonth, junkDay: junkDay, recyclingDay: recyclingDay, recyclingScheduleA: recyclingScheduleA };
                    this.buildEvents(this.numberOfDays);
                    return this.events;
                }
            },
            isValidData: {
                value: function isValidData(data) {
                    return data && data.features && data.features.length && data.features[0].attributes;
                }
            },
            isWasteDay: {
                value: function isWasteDay(day) {
                    return day.day() == this.pickupDays.wasteDay;
                }
            },
            isHeavyDay: {

                //used for both trash/and junk days

                value: function isHeavyDay(day) {
                    var dayInMonth = day.clone().startOf("month");
                    var occurances = 0;
                    while (occurances < this.pickupDays.junkWeekOfMonth) {
                        if (dayInMonth.day() == this.pickupDays.junkDay) {
                            occurances++;
                        }
                        dayInMonth.add(1, "days");
                    }
                    //offset the last day added (ew)
                    dayInMonth.add(-1, "days");
                    return dayInMonth.isSame(day, "day");
                }
            },
            isTreeDay: {
                value: function isTreeDay(day) {
                    return !this.isEvenMonth(day) && this.isHeavyDay(day);
                }
            },
            isJunkDay: {
                value: function isJunkDay(day) {
                    return this.isEvenMonth(day) && this.isHeavyDay(day);
                }
            },
            isEvenMonth: {
                value: function isEvenMonth(day) {
                    return (day.month() + 1) % 2 == 0;
                }
            },
            isRecyclingDay: {
                value: function isRecyclingDay(day) {
                    //recycling schedule A occurs every other week (starting at second week)
                    var isEvenWeek = day.weeks() % 2 == 0;
                    var isThisWeek = this.pickupDays.recyclingScheduleA && isEvenWeek || !this.pickupDays.recyclingScheduleA && !isEvenWeek;
                    return isThisWeek && day.day() == this.pickupDays.recyclingDay;
                }
            },
            isPossibleHoliday: {
                value: function isPossibleHoliday(day) {
                    return _.some(this.holidays, function (d) {
                        return d.isSame(day, "day");
                    });
                }
            },
            getCategoriesForDay: {
                value: function getCategoriesForDay(day) {
                    var eventsForDay = {
                        waste: this.isWasteDay(day),
                        junk: this.isJunkDay(day),
                        tree: this.isTreeDay(day),
                        recycling: this.isRecyclingDay(day)
                    };
                    //group filter out empty days
                    return _.pairs(eventsForDay).filter(function (category) {
                        return category[1];
                    }).map(function (category) {
                        return category[0];
                    });
                }
            },
            buildEvents: {
                value: function buildEvents(numberOfDays) {
                    var _this = this;

                    var day = moment().startOf("day");
                    var groupEvents = function (day) {
                        return {
                            day: day, categories: _this.getCategoriesForDay(day), possibleHoliday: _this.isPossibleHoliday(day)
                        };
                    };
                    this.events = _.range(0, numberOfDays).map(function (i) {
                        return day.clone().add(i, "days");
                    }).map(groupEvents).filter(function (event) {
                        return event.categories.length;
                    });
                }
            }
        }, {
            getDayIndex: {
                value: function getDayIndex(dayStr) {
                    return moment(dayStr, "dddd").day();
                }
            },
            service: {
                value: function service($http, $q) {
                    return function (pos, numberOfDays) {
                        return new Scheduler($http, $q, pos, numberOfDays);
                    };
                }
            }
        });

        return Scheduler;
    })();
});
define("AppCtrl", ["exports"], function (exports) {
    "use strict";

    var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var AppCtrl = exports.AppCtrl = (function () {
        function AppCtrl($scope, SchedulerService, $q, GeoLocation) {
            _classCallCheck(this, AppCtrl);

            this.$q = $q;
            this.loadingSchedule = false;
            this.schedulerService = SchedulerService;
            this.geoLocation = GeoLocation;
        }

        _createClass(AppCtrl, {
            queryAddress: {
                value: function queryAddress(address) {

                    if (address == "") {
                        this.events = null; //clear out data
                    }
                    if (address.split([" "]).length == 1) {
                        return this.$q.when([{ placeholder: true, text: "Keep typing your address to see results..." }]);
                    }

                    return this.geoLocation.lookupAddress(address).then(function (r) {
                        console.log("results", r);
                        return r;
                    });
                }
            },
            getCategorySchedule: {
                value: function getCategorySchedule(category) {
                    var schedule = "unknown";
                    if (category == "junk") {
                        schedule = moment().date(this.pickupDays.junkWeekOfMonth).format("Do") + " (Even Months)";
                    } else if (category == "tree") {
                        schedule = moment().date(this.pickupDays.junkWeekOfMonth).format("Do") + " (Odd Months)";
                    } else if (category == "waste") {
                        schedule = "Every " + AppCtrl.dayOfWeek(this.pickupDays.wasteDay);
                    } else if (category == "recycling") {
                        schedule = "Every Other " + AppCtrl.dayOfWeek(this.pickupDays.recyclingDay);
                    }
                    return schedule;
                }
            },
            getCategoryImage: {
                value: function getCategoryImage(category) {
                    return "url(\"img/" + category + "-gray.png\")";
                }
            },
            selectAddress: {
                value: function selectAddress(suggestion) {
                    var _this = this;

                    if (!suggestion) {
                        this.events = null;
                        this.searchText = null;
                        return;
                    }
                    this.address = suggestion;
                    this.loadingSchedule = true;
                    this.geoLocation.lookupCoordinates(suggestion).then(function (coords) {
                        var scheduler = _this.schedulerService(coords, 60);
                        scheduler.whenLoaded.then(function () {
                            _this.pickupDays = scheduler.pickupDays;
                            _this.loadingSchedule = false;
                            _this.events = scheduler.events;
                        });
                    });
                }
            },
            niceCategoryName: {
                value: function niceCategoryName(category) {
                    if (category == "waste") {
                        return "Trash & Yard";
                    } else {
                        return category.charAt(0).toUpperCase() + category.slice(1);
                    }
                }
            }
        }, {
            dateFilter: {
                value: function dateFilter(day) {
                    if (moment().isSame(day, "day")) {
                        return "Today " + day.format("MMM Do");
                    } else if (moment().add(1, "days").isSame(day, "day")) {
                        return "Tomorrow " + day.format("MMM Do");
                    } else {
                        return day.format("dddd MMM Do");
                    }
                }
            },
            dayOfWeek: {
                value: function dayOfWeek(day) {
                    return moment().day(day).format("dddd");
                }
            }
        });

        return AppCtrl;
    })();
});
define("ScrollDirective", ["exports"], function (exports) {
  "use strict";
});
define("app", ["exports", "AppCtrl", "Scheduler", "GeoLocation"], function (exports, _AppCtrl, _Scheduler, _GeoLocation) {
    "use strict";

    var AppCtrl = _AppCtrl.AppCtrl;
    var Scheduler = _Scheduler.Scheduler;
    var GeoLocation = _GeoLocation.GeoLocation;

    angular.module("StarterApp", ["ngMaterial"]).config(function ($mdThemingProvider) {
        $mdThemingProvider.definePalette("rollout", {
            "50": "#ebf8f0",
            "100": "#c4ebd2",
            "200": "#9dddb4",
            "300": "#7cd29a",
            "400": "#5cc681",
            "500": "#3bbb68",
            "600": "#34a45b",
            "700": "#2c8c4e",
            "800": "#257541",
            "900": "#1e5e34",
            A100: "#c4ebd2",
            A200: "#9dddb4",
            A400: "#5cc681",
            A700: "#2c8c4e"
        });
        $mdThemingProvider.theme("default").primaryPalette("rollout");
    }).controller("AppCtrl", AppCtrl).service("SchedulerService", Scheduler.service).service("GeoLocation", GeoLocation).filter("date", function () {
        return AppCtrl.dateFilter;
    }).filter("dayOfWeek", function () {
        return AppCtrl.dayOfWeek;
    });
});
//# sourceMappingURL=all.js.map

angular
    .module('TrailRunner', ['ngMaterial', 'ngMessages', 'ngRoute'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'app/map.partial.html',
            controller: 'TrailCtrl'
        }).
        otherwise({
            redirectTo: '/'
        });
    }])
    .config(function($mdThemingProvider) {

  $mdThemingProvider.theme('default')
            .primaryPalette('red')
            .accentPalette('orange');
  $mdThemingProvider.theme('docs-dark')
      .primaryPalette('grey')
      .accentPalette('red')
      .dark();
    })
    .controller('TrailCtrl', function($scope, $timeout, $mdSidenav, $log) {
        $scope.toggleLeft = buildDelayedToggler('left');
        $scope.toggleRight = buildToggler('right');
        $scope.isOpenRight = function() {
            return $mdSidenav('right').isOpen();
        };
         $scope.open = function() {
            $mdSidenav('left').open()
        };
        $scope.travelModes = [{
            value: google.maps.TravelMode.WALKING,
            label: 'Walking/Running'
        }, {
            value: google.maps.TravelMode.BICYCLING,
            label: 'Bicycling'
        }, {
            value: google.maps.TravelMode.DRIVING,
            label: 'Driving'
        }]
        $scope.travelMode = google.maps.TravelMode.WALKING // default
        $scope.trailDistance = null;
        $scope.trailLength = 5;
          $scope.getTrail = function(val){
            $scope.trailLength = val;
        }
          $scope.getTravelMode = function(val){
            $scope.travelMode = val;
        }

          var map = new google.maps.Map(document.getElementById('map'), {
                center: new google.maps.LatLng(37.397, -120.644),
                scrollwheel: false,
                zoom: 6
            });

       var marker = new google.maps.Marker({
                map: map,
                anchorPoint: new google.maps.Point(0, -29)
            });

        $scope.getLoop = function() {
            initMap($scope.originLocation, $scope.trailLength, $scope.travelMode);
            setTimeout(function(){
                removeSelectLeg();
                angular.element(document.getElementsByClassName('adp-warnbox')).remove();
                angular.element(document.getElementsByClassName('adp-placemark')).remove();
                angular.element(document.getElementsByClassName('adp-legal')).remove();
                angular.element(document.getElementsByClassName('adp-summary')).remove();
               var rows = document.querySelectorAll('.adp-directions tr')
                for(var i = 0;i<rows.length;i++){
                rows[i].querySelectorAll('td')[1].innerHTML = i+1;
                }

            }, 1000)
        };


        $scope.initSearchBox = function() {
          // remove placeholder set by google api, due to some bug either in angular-material or google maps api
          // inline placeholder is not overriding this value
          document.getElementById('search-box').placeholder = '';
            var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-box'));
           // autocomplete.bindTo('bounds', map);
            var infowindow = new google.maps.InfoWindow();
            autocomplete.addListener('place_changed', function() {
                infowindow.close();
                marker.setVisible(false);
                var place = autocomplete.getPlace();
                if (!place.geometry) {
                    window.alert("Autocomplete's returned place contains no geometry");
                    return;
                }

                // If the place has a geometry, then present it on a map.
                if (place.geometry.viewport) {
                    map.fitBounds(place.geometry.viewport);
                }
                    console.log('geo coded lat:%s lng:%s', place.geometry.location.lat(), place.geometry.location.lng())
                   $scope.originLocation  = place.geometry.location;
                    map.setCenter(place.geometry.location);
                    map.setZoom(17); // Why 17? Because it looks good.

                marker.setIcon( /** @type {google.maps.Icon} */ ({
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(35, 35)
                }));
                marker.setPosition(place.geometry.location);
                marker.setVisible(true);

                var address = '';
                if (place.address_components) {
                    address = [
                        (place.address_components[0] && place.address_components[0].short_name || ''),
                        (place.address_components[1] && place.address_components[1].short_name || ''),
                        (place.address_components[2] && place.address_components[2].short_name || '')
                    ].join(' ');
                }

                infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address);
                infowindow.open(map, marker);
            });

        }

        function calcSquare(origin, maxDist) {
            const geo = origin;
            var unitDist = 0.00691; // in miles, 11.132 in meters
            var edge = (maxDist * unitDist) / 4;

           // 4 coordinates representing 4 corners of the square
            var UP = {
                lat: origin.lat + edge,
                lng: origin.lng
            }
            var RIGHT = {
                lat: origin.lat,
                lng: origin.lng - edge
            }
            var DOWN = {
                lat: origin.lat - edge,
                lng: origin.lng
            }
            var LEFT = {
                lat: origin.lat,
                lng: origin.lng + edge
            }

            origin = angular.copy(geo) // reset
            var p1 = origin = RIGHT;
            var p2 = origin = DOWN;
            var p3 = origin = LEFT;
            var p4 = origin = UP;
            var points = [
                [geo, p1, p2, p3]
            ];


            origin = angular.copy(geo) // reset
            p1 = origin = UP, p2 = origin = RIGHT, p3 = origin = DOWN, p4 = origin = LEFT
            points.push([geo, p1, p2, p3]);

            origin = angular.copy(geo) // reset
            p1 = origin = LEFT, p2 = origin = UP, p3 = origin = RIGHT, p4 = origin = DOWN
                //  points.push([geo, p1, p2, p3]);

            origin = angular.copy(geo) // reset
            p1 = origin = DOWN, p2 = origin = RIGHT, p3 = origin = UP, p4 = origin = LEFT
                // points.push([geo, p1, p2, p3]);
            return points;
        }

        function showMarkers(latLngArr) {
            var map = new google.maps.Map(document.getElementById('map'), {
                zoom: 10,
                center: latLngArr[0]
            });
            latLngArr.forEach(function(latLng) {
                var marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: String(latLng.lat) + String(latLng.lng)
                });
            })
        }

        function initMap(origin, miles) {
         if(!miles || !origin) return
//             var miles = 6;
//             var start = {
//                 lat: 37.362376,
//                 lng: -122.025885
//             };
          var start = {
            lat: origin.lat(),
            lng: origin.lng()
          }


            var points = calcSquare(start, miles);
            var requests = composeLoopRouteReqs(points, $scope.travelMode);
            var loops = getAllLoopDirections(requests)
            loops = loops.map(function(loopPromiseArr) {
                return getLoopDirections(loopPromiseArr).then();
            });


            Promise.all(loops).then(function(res) {
                 var results = rankResults(res, miles);
                  $scope.trailDistance= results[0].totalDistance ;//Math.ceil(results[0].totalDistance);
                displayLoop(results[0]); // pass the first one because thats the best route
            }, function(error) {
                console.error(error)
            })
        }


        function displayLoop(result) {
          document.getElementById('directions').innerHTML = '';
          console.log('FINAL', result)
             //map.setZoom(10);
          var bounds = new google.maps.LatLngBounds();
            result.directions.map(function(leg, index) {
              bounds.union(leg.routes[0].bounds);
              map.setCenter(bounds.getCenter());
              map.fitBounds(bounds);
              var routeDisplay = new google.maps.DirectionsRenderer({
                    map: map,
                    panel: document.getElementById('directions'),
                    suppressMarkers:true
                });
               routeDisplay.setOptions({
                  polylineOptions: {
                        strokeWeight: 4,
                        strokeOpacity: 0.8,
                        strokeColor: 'red'
                    }
               })

                routeDisplay.setDirections(leg);
              if(result.directions.length > 0 ){
             //console.log(new google.maps.LatLng(result.directions[0].request.origin.lat, result.directions[0].request.origin.lng))
                marker.setPosition(new google.maps.LatLng(result.directions[0].request.origin.lat, result.directions[0].request.origin.lng));
              marker.setVisible(true);
              }

            })

        }

        function rankResults(results, miles) {
            results.sort(function(a, b) {
                //return a.totalDistance - b.totalDistance
                return a.totalDistance - miles
            })
            return results;
        }

        function composeLoopRouteReqs(pointsArr, travelMode) {
            var loopReqs = [];

            pointsArr.map(function(points) {
                var loop = points.map(function(start, index) {
                  return {
                        destination: (points.length - 1 === index) ? points[0] : points[index + 1],
                        origin: start,
                        travelMode:  google.maps.TravelMode[travelMode],
                        unitSystem: google.maps.UnitSystem.IMPERIAL
                    };
                })
                loopReqs.push(loop);
            })
            return loopReqs;
        }

        function getAllLoopDirections(requestArr) {
            var loops = [];
            requestArr.map(function(requests) {
                var promiseArr = requests.map(function(req) {
                    return getDirections(req).then();
                })
                loops.push(promiseArr);
            })
            return loops;
        }

        function getLoopDirections(promises) {
            return new Promise(function(resolve, reject) {
                Promise.all(promises).then(function(directions) {
                    var totalDistance = 0;
                    directions.map(function(leg) {
                        totalDistance += calcTotalDistance(leg.routes[0].legs);
                    })
                    resolve({
                        directions: directions,
                        totalDistance: totalDistance
                    })
                    console.log('total distance', totalDistance)
                }, function(error) {
                    console.log(error)
                    reject(error);
                })
            })
        }

        function composeRouteRequests(points, travelMode) {
            var requests = [];
            points.map(function(start, index) {
                requests.push({
                    destination: (points.length - 1 === index) ? points[0] : points[index + 1],
                    origin: start,
                    travelMode:  google.maps.TravelMode[travelMode],
                    unitSystem: google.maps.UnitSystem.IMPERIAL
                });
            })
            return requests;
        }

        function composeRequests(pointsArr, travelMode) {
            var requests = [];
            pointsArr.map(function(points) {
                points.map(function(start, index) {
                    requests.push({
                        destination: (points.length - 1 === index) ? points[0] : points[index + 1],
                        origin: start,
                        travelMode: google.maps.TravelMode[travelMode],
                        unitSystem: google.maps.UnitSystem.IMPERIAL
                    });
                })
            })
            return requests;
        }

        function getDirections(request) {
            return new Promise(function(resolve, reject) {
                // Pass the directions request to the directions service.
                var directionsService = new google.maps.DirectionsService();
                directionsService.route(request, function(response, status) {

                    if (status == google.maps.DirectionsStatus.OK) {
                        return resolve(response);
                    }
                    return reject(response);
                });
            })

        }

        function calcTotalDistance(legs) {
            var totalDistance = 0;
            legs.map(function(waypoint) {
                totalDistance += Number(waypoint.distance.text.replace(' mi', ''));
            })
            return totalDistance;
        }

        function removeSelectLeg(){
          var elements = document.querySelectorAll("[jsaction='directionsPanel.selectLeg'],[class='adp-summary']");
          var tables = document.querySelectorAll("table[class='adp-directions']");
          for(var i=0; i< elements.length; i++){
             // elements[i].remove();
          }
          // document.getElementById('directions').innerHTML = "";
          for(var i=0; i< tables.length; i++){
            // document.getElementById('directions').innerHTML += tables[i].innerHTML;
          }


        }



        //   ------------------------------------------------------------------------
        /**
         * Supplies a function that will continue to operate until the
         * time is up.
         */
        function debounce(func, wait, context) {
            var timer;

            return function debounced() {
                var context = $scope,
                    args = Array.prototype.slice.call(arguments);
                $timeout.cancel(timer);
                timer = $timeout(function() {
                    timer = undefined;
                    func.apply(context, args);
                }, wait || 10);
            };
        }

        /**
         * Build handler to open/close a SideNav; when animation finishes
         * report completion in console
         */
        function buildDelayedToggler(navID) {
            return debounce(function() {
                // Component lookup should always be available since we are not using `ng-if`
                $mdSidenav(navID)
                    .toggle()
                    .then(function() {
                        $log.debug("toggle " + navID + " is done");
                    });
            }, 200);
        }

        function buildToggler(navID) {
            return function() {
                // Component lookup should always be available since we are not using `ng-if`
                $mdSidenav(navID)
                    .toggle()
                    .then(function() {
                        $log.debug("toggle " + navID + " is done");
                    });
            }
        }
    })
    .controller('LeftCtrl', function($scope, $timeout, $mdSidenav, $log) {
        $scope.close = function() {
            // Component lookup should always be available since we are not using `ng-if`
            $mdSidenav('left').close()
                .then(function() {
                    $log.debug("close LEFT is done");
                });

        };
    })
    .controller('RightCtrl', function($scope, $timeout, $mdSidenav, $log) {
        $scope.close = function() {
            // Component lookup should always be available since we are not using `ng-if`
            $mdSidenav('right').close()
                .then(function() {
                    $log.debug("close RIGHT is done");
                });
        };
    });


/**
Copyright 2016 Google Inc. All Rights Reserved.
Use of this source code is governed by an MIT-style license that can be in foundin the LICENSE file at http://material.angularjs.org/license.
**/
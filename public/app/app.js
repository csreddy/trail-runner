angular
  .module('TrailRunner',['ngMaterial', 'ngMessages',  'ngRoute'])
  .config(['$routeProvider', function($routeProvider){
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
})
  .controller('TrailCtrl', function ($scope, $timeout, $mdSidenav, $log) {
    $scope.toggleLeft = buildDelayedToggler('left');
    $scope.toggleRight = buildToggler('right');
    $scope.isOpenRight = function(){
      return $mdSidenav('right').isOpen();
    };
     $scope.initMap = function(){
       console.log('found div')
       initMap();
     };
  console.log('mapp')
  function calcSquare(origin, maxDist){
    const geo = origin;
    var unitDist = 0.00691; // in miles, 11.132 in meters
    var edge = (maxDist * unitDist)/4;

    var UP    =  {lat: origin.lat + edge,   lng: origin.lng}
    var DOWN  =  {lat: origin.lat - edge ,  lng: origin.lng}
    var LEFT  =  {lat: origin.lat,          lng: origin.lng + edge}
    var RIGHT =  {lat: origin.lat,          lng: origin.lng - edge}

    // 4 coordinates representing 4 corners of the square
//    var p1 = origin = {lat: origin.lat + edge, lng: origin.lng} // up
//    var p2 = origin = {lat: origin.lat, lng: origin.lng - edge} // right
//    var p3 = origin = {lat: origin.lat - edge , lng: origin.lng} // down
//    var p4 = origin = {lat: origin.lat, lng: origin.lng + edge} // left

    origin = angular.copy(geo) // reset
   var p1 = origin = RIGHT;
   var p2 = origin = DOWN;
   var p3 = origin = LEFT;
   var p4 = origin = UP;
   var points = [[p1, p2, p3, p4]];

    origin = angular.copy(geo) // reset
    p1 = origin = UP, p1 = origin = RIGHT, p1 = origin = DOWN, p1 = origin = LEFT
    points.push([p1, p2, p3, p4]);

    origin = angular.copy(geo) // reset
    p1 = origin = LEFT, p1 = origin = UP, p1 = origin = RIGHT, p1 = origin = DOWN
    points.push([p1, p2, p3, p4]);

    origin = angular.copy(geo) // reset
    p1 = origin = DOWN, p1 = origin = RIGHT, p1 = origin = UP, p1 = origin = LEFT
    points.push([p1, p2, p3, p4]);

    console.log(points);
    return points;
  }

  function showMarkers(latLngArr){
    var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: latLngArr[0]
  });
    latLngArr.forEach(function(latLng){
    var marker = new google.maps.Marker({
    position: latLng,
    map: map,
    title: String(latLng.lat)  + String(latLng.lng)
  });
    })
  }

  function initMap() {
    var miles = 6;
     var start = {lat: 37.362376, lng: -122.025885};
   // var start = {lat: 37.397, lng: 120.644};
     var points = calcSquare(start, miles);

    var map = new google.maps.Map(document.getElementById('map'), {
    center: start,
    scrollwheel: false,
    zoom: 10
  });

  var directionsDisplay = new google.maps.DirectionsRenderer({
    map: map
  });
    var routeDisplay = [];

//     var requests = points.map(function(start, index){
//         return {
//             destination: (points.length-1 ===  index) ? points[0] : points[index+1],
//             origin: start,
//             travelMode: google.maps.TravelMode.WALKING,
//             unitSystem: google.maps.UnitSystem.IMPERIAL
//           };
//     })
    var requests = composeRequests(points);
    console.log(requests)
    var promises = requests.map(function(request){
        return getDirections(request).then();
    })

        //[getDirections(request1).then(), getDirections(request2).then()]
    Promise.all(promises).then(function(directions){
      var totalDistance = 0;
      directions.map(function(leg, index){
        routeDisplay[index] = new google.maps.DirectionsRenderer({
                      map: map
                      });
        //directionsDisplay.setDirections(leg);
        routeDisplay[index].setDirections(leg);
         var legDistance = calcTotalDistance(leg.routes[0].legs)
        totalDistance +=  legDistance;
        console.log('leg distance', legDistance)
      })
   console.log('total distance', totalDistance)
    }, function(error){
        console.log(error)
    })

    //showMarkers(points)
}
  function composeRequests(pointsArr){
    var requests = [];
    pointsArr.map(function(points){
       points.map(function(start, index){
        requests.push({
            destination: (points.length-1 ===  index) ? points[0] : points[index+1],
            origin: start,
            travelMode: google.maps.TravelMode.WALKING,
            unitSystem: google.maps.UnitSystem.IMPERIAL
          });
    })
      })
    return requests;
  }


  function getDirections(request){
    return new Promise(function(resolve, reject){
          // Pass the directions request to the directions service.
  var directionsService = new google.maps.DirectionsService();
  directionsService.route(request, function(response, status) {
      console.log(response);
    if (status == google.maps.DirectionsStatus.OK) {
      return resolve(response);
    }
      return reject(response);
  });
    })

  }

  function calcTotalDistance(legs){
    var totalDistance = 0;
    legs.map(function(waypoint){
        totalDistance += Number(waypoint.distance.text.replace(' mi', ''));
      })
    return totalDistance;
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
          .then(function () {
            $log.debug("toggle " + navID + " is done");
          });
      }, 200);
    }

    function buildToggler(navID) {
      return function() {
        // Component lookup should always be available since we are not using `ng-if`
        $mdSidenav(navID)
          .toggle()
          .then(function () {
            $log.debug("toggle " + navID + " is done");
          });
      }
    }
  })
  .controller('LeftCtrl', function ($scope, $timeout, $mdSidenav, $log) {
    $scope.close = function () {
      // Component lookup should always be available since we are not using `ng-if`
      $mdSidenav('left').close()
        .then(function () {
          $log.debug("close LEFT is done");
        });

    };
  })
  .controller('RightCtrl', function ($scope, $timeout, $mdSidenav, $log) {
    $scope.close = function () {
      // Component lookup should always be available since we are not using `ng-if`
      $mdSidenav('right').close()
        .then(function () {
          $log.debug("close RIGHT is done");
        });
    };
  });


/**
Copyright 2016 Google Inc. All Rights Reserved.
Use of this source code is governed by an MIT-style license that can be in foundin the LICENSE file at http://material.angularjs.org/license.
**/
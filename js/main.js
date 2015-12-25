"use strict";

var CheckList = Parse.Object.extend("CheckList");
var currentUser;

angular.module('ChecklistWiki', ['ui.router', 'ngSanitize', 'ui.bootstrap'])
.run(function() {
	Parse.initialize("fFEhX09Yqhfsd0OiP7OapeXRlcnEk4zLPZSU2AAm", "UdBF2CQcZ9Ae7KBugoN3QXY7UsOy62uDMOoozbuc");
	currentUser = Parse.User.current();
})
.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('home', {
			url: '/home',
			templateUrl: 'partials/home.html',
			controller: 'HomeCtrl'
		})
		.state('login', {
			url: '/login',
			templateUrl: 'partials/login.html',
			controller: 'LoginCtrl'
		})
		.state('signup', {
			url: '/signup',
			templateUrl: 'partials/signup.html',
			controller: 'SignupCtrl'
		})
		.state('profile', {
			url: '/profile',
			templateUrl: 'partials/profile.html',
			controller: 'ProfileCtrl'
		})
		.state('addList', {
			url: '/addList',
			templateUrl: 'partials/addList.html',
			controller: 'AddListCtrl'
		});

		$urlRouterProvider.otherwise('/home');
})

.controller("MainCtrl", ['$scope', '$http', '$state', function($scope, $http, $state) {
	$scope.tabs;

	// Set tabs on the page
	$scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) { 
		switch(toState.name) {
			case 'signup':
			case 'login':
				$scope.tabs = ['home', 'login', 'signup' ];
				break;
			case 'home':
			case 'profile':
			case 'addList':
				if(currentUser == null) {
					$scope.tabs = ['home', 'login', 'signup'];
					break;
				}
				else {
					$scope.tabs = ['home', 'profile'];
					break;
				}
		}
	})
	
}])
.controller("HomeCtrl", ['$scope', '$state', '$q', '$interval', function($scope, $state, $q, $interval) {
	$scope.lists = [];
	var DatesDfd = $q.defer();
      
    // Get new Lunch Dates every minute
	var tick = function() {
		$scope.timeNow = Date.now();
		var query = new Parse.Query(CheckList);
		query.find().then(function(results) {
			DatesDfd.resolve(results);
		})
	};

	// Load the page with the current Checklists
	DatesDfd.promise.then(function(checklists) {
		checklists.forEach(function(list) {
			var item = {
				name: list.get('name'),
				type: list.get('type'),
				items: list.get('items'),
				user: list.get('user')
			}
			console.log(item);
			$scope.lists.push(item);
		})	
	});

	tick();
	$interval(tick, 1000 * 60);

	$scope.checkStatus = function() {
		if(currentUser == null) {
			alert("You must be logged in to add a new list");
		}
		else {
			$state.go('addList');
		}
	}
}])

.controller("LoginCtrl", ['$scope', '$state', function($scope, $state) {
	$scope.showInfo = false;

	$scope.login = function(uName, passwd) {
		Parse.User.logIn(uName, passwd, {
			success: function(user) {
				currentUser = user;
				$state.go('home');
			},
			error: function(user, error) {
				$scope.invalidCred = true;
				console.log("LOGIN ERROR + " + error);
				$scope.invalidCred = true;
			}
		}) 
	}
}])

.controller("SignupCtrl", ['$scope', '$state', function($scope, $state) {
	$scope.newUser = {};

	$scope.signup = function(photo, uName, passwd, email) {
		if(photo == null) {
			photo = "images/default-profile.png";
		}
		var user = new Parse.User();
		user.set('email', email);
		user.set('username', uName);
		user.set('password', passwd);
		user.set('photo', photo);

		user.signUp(null, {
			success: function(user) {
				currentUser = user;
				$state.go('home');

			},
			error: function(user, error) {
				console.log("Signup error: " + error)
			}
		});
	}	
}])

.controller("ProfileCtrl", ['$scope', '$state', '$q', function($scope, $state, $q) {
	$scope.currentUser = {};
	var DateDfd = $q.defer();
	$scope.dates = [];

	// Get the current user data
	$scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
		$scope.currentUser.uName = currentUser.get('username');
		$scope.currentUser.photo = currentUser.get('photo');
		var query = new Parse.Query(CheckList);
		query.equalTo('user', currentUser);
		query.find().then(function(response) {
			DateDfd.resolve(response);
		})
	})

	$scope.logout = function() {
		if(currentUser) {
			Parse.User.logOut();
			currentUser = null;
			$state.go('login');
		}
	}
}])

.controller("AddListCtrl", ['$scope', '$state', function($scope, $state) {
	$scope.$on('$stateChangeSuccess', function() {
		if(currentUser == null) {
			$state.go('home');
			checkStatus();
		}
	})

	$scope.items = [];

    $scope.add = function () {
	    $scope.items.push({ 
        });
    };

    $scope.remove = function() {
    	if($scope.items.length > 0) {
    		$scope.items.splice($scope.items.length - 1, 1);
    	}
    }

    $scope.submit = function(name, type, items) {
    	console.log(name);
    	console.log(type);
    	console.log(items);
    	for(var i = 0; i < items.length; i++) {
    		items[i] = items[i].text;
    	}
    	console.log(items);
    	var checkList = new CheckList();
    	checkList.set('user', Parse.User.current());
    	checkList.set('name', name);
    	checkList.set('type', type);
    	checkList.set('items', items);
    	checkList.save(null, {
            success: function (res) {
                console.log(res);
                $state.go('home');
            },
            error: function (res, error) {
                console.log(error);
            }
        });
    }
}])

// Used for password comparison
.directive('sameAs', function() {
    return {
        require: 'ngModel',
        link: function(scope, elem, attrs, ngModel) {
            ngModel.$parsers.unshift(validate);

            // Force-trigger the parsing pipeline.
            scope.$watch(attrs.sameAs, function() {
                ngModel.$setViewValue(ngModel.$viewValue);
            });

            // Checks for validity
            function validate(value) {
                var isValid = scope.$eval(attrs.sameAs) == value;

                ngModel.$setValidity('same-as', isValid);

                return isValid ? value : undefined;
            }
        }
    };
})

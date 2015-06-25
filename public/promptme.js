// public/promptme.js

var app = angular.module('promptMeApp', []);

app.factory('promptMeAPI', ['$http', function($http) {
  return {
    getNotebooks: function() {
        return $http.get('/api/notebooks');
    },
    subscribe: function(options) {
      return $http.post('/api/subscribe', options);
    },
    getSubscriptions: function() {
      return $http.get('/api/subscriptions');
    },
    unsubscribe: function(subscription) {
      return $http.post('/api/unsubscribe', {subscriptionid: subscription.subscriptionid});
    }
  }
}]);

app.controller('promptMeCtrl', ['$scope', '$filter', 'promptMeAPI', function($scope, $filter, promptMeAPI) {
  $scope.notebooks = [];
  $scope.selectedNotebook = '';
  $scope.frequencies = [{interval:24*60*60,label:'Daily'}, {interval:48*60*60,label:'Every other day'}]
  $scope.selectedFrequency = 24*60*60;
  $scope.loggedIn = false;
  $scope.startDate = new Date();
    $scope.startTime = new Date();
    $scope.startTime.setMilliseconds(0);
    $scope.startTime.setSeconds(0);
    $scope.subscriptions = [];

  promptMeAPI.getNotebooks().success(function(results) {
    $scope.notebooks = results;
    $scope.loggedIn = true;
    $scope.selectedNotebook = $scope.notebooks[0].notebookid;
  });

  promptMeAPI.getSubscriptions().success(function(subscriptions) {
    $scope.subscriptions = subscriptions;
  });

  $scope.getNotebookTitle = function(notebookId) {
    for(var i=0; i<$scope.notebooks.length; i++) {
      if($scope.notebooks[i].notebookid == notebookId) {
        return $scope.notebooks[i].title;
      }
    }

    return '';
  }

  $scope.unsubscribe = function(subscription) {
    promptMeAPI.unsubscribe(subscription).success(function(subscription) {
      var oldSubscriptions = $scope.subscriptions;

      $scope.subscriptions = [];
      for(var i=0; i<oldSubscriptions.length; i++) {
        if(oldSubscriptions[i].subscriptionid != subscription.subscriptionid) {
          $scope.subscriptions.push(oldSubscriptions[i]);
        }
      }      
    });
  }

  $scope.subscribe = function() {
    var nextPrompt = new Date($filter('date')($scope.startDate, 'yyyy-MM-dd')+' '+$filter('date')($scope.startTime, 'HH:mm'));

    var options = {
      notebookid: $scope.selectedNotebook,
      start: nextPrompt.getTime(),
      frequency: parseInt($scope.selectedFrequency)
    };

    promptMeAPI.subscribe(options).success(function(subscription) {
      $scope.subscriptions.push(subscription);
    });
  }
}]);
var ApiClient = function($http, $q) {
  /**
   * Perform a request
   *
   * @return object
   */
  var request = function(region, uri) {
    var deferred = $q.defer();

    $http.get('proxy.php?region=' + region + '&uri=' + uri)
      .success(function(data, status, headers, config) {
        deferred.resolve({
          data: data,
          status: status,
          headers: headers,
          config: config
        });
      })
      .error(function(data, status, headers, config) {
        deferred.reject({
          data: data,
          status: status,
          headers: headers,
          config: config
        });
      });

    return deferred.promise;
  };


  return {
    /**
     * Find a character
     *
     * @param  string region
     * @param  string realm
     * @param  string name
     * @return deferred
     */
    findCharacter: function(region, realm, name) {
      return request(
        region,
        '/api/wow/character/' + realm + '/' + name
      );
    },

    /**
     * Find all realms
     *
     * @param  string region
     * @return deferred
     */
    findRealms: function(region) {
      return request(
        region,
        '/api/wow/realm/status'
      );
    }
  }
};

var CharacterDataHelper = function() {
  return {
    /**
     * Get faction name by race id
     *
     * @param  integer id
     * @return string
     */
    getFactionNameByRaceId: function(id) {
      switch (id) {
        case 1:  // Human
        case 3:  // Dwarf
        case 4:  // Night Elf
        case 7:  // Gnome
        case 11: // Draenei
        case 22: // Worgen
        case 25: // Alliance Pandaren
          return 'alliance';
        case 2:  // Orc
        case 5:  // Undead
        case 6:  // Tauren
        case 8:  // Troll
        case 9:  // Goblin
        case 10: // Blood Elf
        case 26: // Horde Pandaren
          return 'horde';
        default:
          return false;
      }
    },

    /**
     * Get race by id
     *
     * @param  integer id
     * @return string
     */
    getRaceById: function(id) {
      switch (id) {
        case 1:
          return 'human';
        case 2:
          return 'orc';
        case 3:
          return 'dwarf';
        case 4:
         return 'night elf';
        case 5:
          return 'undead';
        case 6:
          return 'tauren';
        case 7:
          return 'gnome';
        case 8:
          return 'troll';
        case 9:
          return 'goblin';
        case 10:
          return 'blood elf';
        case 11:
          return 'draenei';
        case 22:
          return 'worgen';
        case 25:
        case 26:
          return 'pandaren';
        default:
          return false;
      }
    }
  }
};

var ConfigManager = function(StorageEngine) {
  /**
   * @type Object
   */
  var keys = StorageEngine.get('wowpr.config') || {};

  return {
    /**
     * Get a config value by its key
     *
     * @param  string key
     * @return string
     */
    get: function(key) {
      return keys[key] || false;
    },

    /**
     * Set a config value by its key
     *
     * @param  string key
     * @param  string value
     * @return ConfigManager
     */
    set: function(key, value) {
      keys[key] = value;

      StorageEngine.set('wowpr.config', keys);

      return this;
    }
  }
};

var SpinnerHelper = function() {
  /**
   * @type Object
   */
  var els    = {};

  els.logo    = angular.element(document.getElementById('logo'));
  els.spinner = angular.element(document.getElementById('spinner'));

  return {
    /**
     * Hides the Spinner
     */
    hideSpinner: function() {
      els.logo.removeClass('hide');
      els.spinner.removeClass('active');
    },

    /**
     * Shows the spinner
     */
    showSpinner: function() {
      els.logo.addClass('hide');
      els.spinner.addClass('active');
    }
  }
};

var StorageEngine = function($cookieStore) {
  /**
   * Check if local storage is supported
   *
   * @return Boolean
   */
  var isLocalStorageAllowed = function() {
    return typeof(Storage) === "undefined"
      ? false
      : true;
  };

  return {
    /**
     * Get a storage value by its key
     *
     * @param  string key
     * @return string
     */
    get: function(key) {
      return isLocalStorageAllowed
        ? JSON.parse(localStorage.getItem(key))
        : $cookieStore.get(key);
    },

    /**
     * Set a storage value by its key
     *
     * @param  string key
     * @param  string value
     * @return ConfigManager
     */
    set: function(key, value) {
      isLocalStorageAllowed
        ? localStorage.setItem(key, JSON.stringify(value))
        : $cookieStore.put(key, value);

        return this;
    },

    /**
     * Unset a storage value by its key
     *
     * @param  string key
     * @return ConfigManager
     */
    unset: function(key) {
      isLocalStorageAllowed
        ? localStorage.removeItem(key)
        : $cookieStore.remove(key);

      return this;
    }
  }
};

'use strict';


// Declare app level module which depends on filters, and services
angular.module('wowpr', [
  'ngAnimate',
  'ngCookies',
  'ngRoute',
  'wowpr.filters',
  'wowpr.services',
  'wowpr.directives',
  'wowpr.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {templateUrl: 'partials/home.html', controller: 'HomeCtrl'});
  $routeProvider.when('/character/:realm/:name', {templateUrl: 'partials/character.html', controller: 'CharacterCtrl'});
  $routeProvider.otherwise({redirectTo: '/'});
}]);

'use strict';

/* Controllers */

angular.module('wowpr.controllers', [])
  /**
   * Home screen controller
   * @route /
   */
  .controller('HomeCtrl', ['$scope', '$q', '$http', '$location', '$templateCache', 'ApiClient', 'CharacterDataHelper', 'ConfigManager', 'SpinnerHelper',
    function($scope, $q, $http, $location, $templateCache, ApiClient, CharacterDataHelper, ConfigManager, SpinnerHelper) {
      // Set up default config values here, other pages can redirect back to here
      // if they don't have sufficient data
      if ( ! ConfigManager.get('region')) {
        ConfigManager.set('region', 'eu');
      }

      var action = {};

      action.regionChange = function() {
        // Save region for future visits
        ConfigManager.set('region', $scope.region);

        // Fetch realms for given region
        SpinnerHelper.showSpinner();
        ApiClient.findRealms($scope.region).then(function(realms) {
          SpinnerHelper.hideSpinner();

          $scope.realms = realms.data.realms;

          $scope.doSearch = function() {
            // Clear any existing errors
            $scope.error = null;

            SpinnerHelper.showSpinner();
            ApiClient.findCharacter(
              $scope.region,
              $scope.formData.realm,
              $scope.formData.name
            ).then(
              // Successfully found character
              function(response) {
                SpinnerHelper.hideSpinner();

                console.log(JSON.stringify(response.data));

                if (JSON.stringify(response.data) !== '{}') {
                  $scope.response = response.data;
                  $location.path('/character/' + $scope.formData.realm + '/' + $scope.formData.name);
                } else {
                  $scope.error = "The armory has not updated this character.";
                }
              },

              // Error finding character
              function(response) {
                SpinnerHelper.hideSpinner();

                $scope.error = response.data.reason;
              }
            );
          };
        });
      };

      action.updateCharacterPreview = function() {
        if ( ! $scope.region || ! $scope.formData.realm || ! $scope.formData.name) {
          return false;
        }

        // Clear any existing errors
        $scope.error = null;

        SpinnerHelper.showSpinner();

        ApiClient.findCharacter(
          $scope.region,
          $scope.formData.realm,
          $scope.formData.name
        ).then(function(response) {
          SpinnerHelper.hideSpinner();

          if (response.data.thumbnail) {
            response.data.profileMain = response.data.thumbnail.replace("avatar.jpg", "profilemain.jpg");
          }

          response.data.factionName = CharacterDataHelper.getFactionNameByRaceId(response.data.race);
          $scope.character = response.data;
        }, function() {
          SpinnerHelper.hideSpinner();
          delete $scope.character;
        });
      };

      var nameTimeout;
      $scope.$watch('region', action.updateCharacterPreview);
      $scope.$watch('formData.realm', action.updateCharacterPreview);
      $scope.$watch('formData.name', function() {
        SpinnerHelper.hideSpinner();
        clearTimeout(nameTimeout);
        nameTimeout = setTimeout(function() {
          action.updateCharacterPreview();
        }, 400);
      });

      $scope.regions = [
        { 'name': 'Europe', 'value': 'eu' },
        { 'name': 'United States', 'value': 'us' },
        { 'name': 'Korea', 'value': 'kr' },
        { 'name': 'Taiwan', 'value': 'tw' }
      ];
      $scope.region  = ConfigManager.get('region');
      $scope.$watch('region', action.regionChange);

      // Cache other templates
      $http.get('partials/character.html', { cache: $templateCache });
    }
  ])

  /**
   * Character screen controller
   * @route /character/:realm/:name
   */
  .controller('CharacterCtrl', ['$scope', '$http', '$location', '$routeParams', '$templateCache', 'ApiClient', 'ConfigManager', 'SpinnerHelper',
    function($scope, $http, $location, $routeParams, $templateCache, ApiClient, ConfigManager, SpinnerHelper) {
      // If config is not set up, send to homepage to get it set up properly
      if ( ! ConfigManager.get('region')) {
        $location.path('/');
      }

      var action = {};

      action.region = ConfigManager.get('region');
      SpinnerHelper.showSpinner();

      ApiClient.findCharacter(action.region, $routeParams.realm, $routeParams.name).then(
        function (response) {
          SpinnerHelper.hideSpinner();
          console.log(response.data);
          $scope.character = response.data;
        },
        function (response) {
          SpinnerHelper.hideSpinner();
          $scope.error = response.data.reason;
        }
      );

      // Cache other templates
      $http.get('partials/home.html', { cache: $templateCache });
    }
  ]);

'use strict';

/* Directives */

angular.module('wowpr.directives', [])
  .directive('asideMenuButton', [function() {
    return {
      restrict: 'A',
      link: function(scope, $el, attrs) {
        var $aside = angular.element(document.getElementById(attrs.parent));
        var $body  = angular.element(document.getElementsByTagName('body'));

        var _hide = function() {
          $aside.removeClass('active');
        };

        var _show = function() {
          $aside.addClass('active');
        };

        $body.on('click', function(e) {
          if ($aside.hasClass('active')) {
            _hide();
          }
        });

        $aside.on('click', function(e) {
          e.stopPropagation();
        });

        $el.on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          if ($aside.hasClass('active')) {
            _hide();
          } else {
            _show();
          }
        });
      }
    };
  }]);

'use strict';

/* Filters */

angular.module('wowpr.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]);

'use strict';

/* Services */


angular.module('wowpr.services', [])
  .service('ApiClient', ['$http', '$q', ApiClient])
  .service('CharacterDataHelper', [CharacterDataHelper])
  .service('ConfigManager', ['StorageEngine', ConfigManager])
  .service('SpinnerHelper', [SpinnerHelper])
  .service('StorageEngine', ['$cookieStore', StorageEngine])
;

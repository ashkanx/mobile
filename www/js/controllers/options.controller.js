/**
 * @name OptionsController
 * @author Massih Hazrati
 * @contributors []
 * @since 10/12/2015
 * @copyright Binary Ltd
 * Handles changing contract's options
 */

angular
	.module('binary')
	.controller('OptionsController',
		function($scope, $rootScope, $state, $window, config, proposalService, accountService, websocketService, chartService) {
			$scope.selected = {};

			if(typeof(analytics) !== "undefined"){
					analytics.trackView("Options");
			}

			websocketService.sendRequestFor.symbols();
			websocketService.sendRequestFor.assetIndex();

			function init(){
				var proposal = proposalService.get();
				if(proposal){
					$scope.selected = {
						symbol: proposal.symbol,
						tradeType: proposal.contract_type,
						tick: proposal.duration,
						basis: proposal.basis,
						market: proposal.passthrough.market,
						digit: proposal.digit
					};
				}
			}

			init();

			$scope.navigateToManageAccounts = function() {
				$state.go('accounts');
			};

			$scope.navigateToTradePage = function() {
				$state.go('trade');
			};

			$scope.saveChanges = function() {
				var proposal = {
					symbol: $scope.selected.symbol,
					contract_type: $scope.selected.tradeType,
					duration: $scope.selected.tick,
					basis: $scope.selected.basis,
					currency: accountService.getDefault().currency,
					passthrough: {
						market: $scope.selected.market
					},
					digit: $scope.selected.digit,
					barrier: $scope.selected.barrier
				};

				proposalService.update(proposal);
				proposalService.send();

				//$state.go('trade', {}, { reload: true, inherit: false, notify: true });
			};

			$scope.$on('connection:reopened', function(e) {
				if (accountService.hasDefault()) {
					accountService.validate();
				}
				$window.location.reload();
			});

			$scope.$watch('selected', function(_newValue, _oldValue){
				if(!angular.equals(_newValue, _oldValue)){
					$scope.saveChanges();
				}
			}, true);
	});


























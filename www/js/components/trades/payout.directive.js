/**
 * @name payout
 * @author Massih Hazrati
 * @contributors []
 * @since 11/07/2015
 * @copyright Binary Ltd
 */

angular
	.module('binary')
	.directive('payout',[
		'websocketService',
		'marketService',
		'proposalService',
		function(websocketService, marketService, proposalService) {
		return {
			restrict: 'E',
			templateUrl: 'templates/components/trades/payout.template.html',
			link: function(scope, element) {

				scope.basis = scope.$parent.proposalToSend.basis || 'payout';
				scope.amount = marketService.getDefault.amount();
                scope.proposalError = null;

				scope.$parent.$watch('proposalRecieved', function(_proposal){
					if (_proposal) {
						var netProfit = parseFloat(_proposal.payout) - parseFloat(_proposal.ask_price);
						_proposal.netProfit =  (isNaN(netProfit) || netProfit < 0) ? '0' : netProfit.toFixed(2);
						scope.proposal = _proposal;
                        scope.proposalError = null;

                        if(scope.$parent && scope.$parent.purchaseFrom){
                            scope.$parent.purchaseFrom.amount.$setValidity("InvalidAmount", true);
                        }
                        
                        if(!scope.$$phase){
                            scope.$apply();
                        }
					}
				});

                scope.$on('proposal:error', function(e, error){
                    scope.proposalError = error;

                    if(scope.$parent.purchaseFrom){
                        scope.$parent.purchaseFrom.amount.$setValidity("InvalidAmount", false);
                    }
                    
                    if(!scope.$$phase){
                        scope.$apply();
                    }
                });

				var roundNumber = function(_newAmount, _oldAmount) {
					var parsed = parseFloat(_newAmount, 10);
					if (parsed !== parsed) {
						return _oldAmount;
					}
					return Math.round(parsed * 100) / 100;
				};

				var updateProposal = function() {
					var proposal = proposalService.get();
					if (proposal) {
						proposal.amount = parseFloat(scope.amount, 10);
						proposalService.update(proposal);
						proposalService.send(scope.proposal && scope.proposal.id ? scope.proposal.id : null);
					}
				};

				scope.updateAmount = function(_newAmount, _oldAmount) {
					// scope.amount = parseFloat(parseFloat(_newAmount).toFixed(2));//roundNumber(_newAmount, _oldAmount);
					updateProposal();
				};

				// TODO: limit to the account balance for stake
				// TODO: figure out how to handle it for payout
				scope.addAmount = function() {
					var amount = parseFloat(scope.amount);
                    
                    if(isNaN(amount)){
                        amount = 0;
                    }

					scope.amount = (amount < 100000) ? Number(amount + 1).toFixed(2) : 100000;
					updateProposal();
				};

				scope.subtractAmount = function() {
					var amount = parseFloat(scope.amount);
					scope.amount = (amount > 2) ? Number(amount - 1).toFixed(2) : 1;
					updateProposal();
				};

				scope.isObjectEmpty = function(_obj) {
					return _.isEmpty(_obj);
				}
			}
		};
	}]);

/**
 * @name alertService
 * @author Massih Hazrati
 * @contributors []
 * @since 10/26/2015
 * @copyright Binary Ltd
 */

angular
	.module('binary')
	.service('alertService',
		function($translate, $ionicPopup) {
			var displayAlert = function(_title, _message) {
				var alertPopup = $ionicPopup.alert({
					title: _title,
					template: _message
				});
			};

			this.accountError = {
				tokenNotValid: function() {
					$translate(['alert.error', 'alert.not_valid'])
					.then(function (translation) {
						displayAlert(translation['alert.error'], translation['alert.not_valid']);
					});
				},
				tokenNotAuthenticated: function() {
					$translate(['alert.error', 'alert.not_auth'])
					.then(function (translation) {
						displayAlert(translation['alert.error'], translation['alert.not_auth']);
					});
				},
				tokenNotUnique: function() {
					$translate(['alert.error', 'alert.not_unique'])
					.then(function (translation) {
						displayAlert(translation['alert.error'], translation['alert.not_unique']);
					});
				}
			};

	});
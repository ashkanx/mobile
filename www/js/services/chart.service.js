/**
 * @name chartService 
 * @author Amin Marashi
 * @contributors []
 * @since 11/25/2015
 * @copyright Binary Ltd
 */

angular
	.module('binary')
	.factory('chartService',
		function() {
			var localHistory,
					chartDrawer,
					contracts = [],
					utils = {
						zeroPad : function zeroPad(num){
							if (num < 10){
								return '0' + num;
							} else {
								return num.toString();
							}
						},
						getTickTime : function getTickTime(tick) {
							var date = new Date(tick*1000); 
							return date.getUTCHours() +	':' + utils.zeroPad(date.getUTCMinutes()) + ':' + utils.zeroPad(date.getUTCSeconds());
						},
						isDefined : function isDefined(obj) {
							if ( typeof obj === 'undefined' ) {
								return false;
							} else {
								return true;
							}
						},
						setObjValue : function setObjValue(obj, attr, value, condition) {
							if ( utils.isDefined( obj ) ) {
								if ( utils.isDefined( condition ) ) {
									if ( condition ) {
										obj[attr] = value;
									}
								} else if ( typeof obj[attr] === 'undefined' ) {
									obj[attr] = value;
								}
							}
						},
						fractionalLength : function fractionalLength(floatNumber) {
							var stringNumber = floatNumber.toString(),
									decimalLength = stringNumber.indexOf('.');
							return stringNumber.length - decimalLength - 1;
						},
						maxFractionalLength : function maxFractionalLength(floatNumbers) {
							var max = 0;
							floatNumbers.forEach(function(number){
								max = (max < utils.fractionalLength(number))? utils.fractionalLength(number): max;
							});
							return max;
						},
						lastDigit : function lastDigit(num) {
							return parseInt(num.toString().slice(-1));
						},
						conditions : {
							CALL: function condition(barrier, price) {return parseFloat(price) > parseFloat(barrier);}, 
							PUT: function condition(barrier, price) {return parseFloat(price) < parseFloat(barrier);},
							DIGITMATCH: function condition(barrier, price) {return utils.lastDigit(barrier) == utils.lastDigit(price);},
							DIGITDIFF: function condition(barrier, price) {return utils.lastDigit(barrier) != utils.lastDigit(price);},
							DIGITEVEN: function condition(barrier, price) {return utils.lastDigit(price) % 2 == 0;},
							DIGITODD: function condition(barrier, price) {return utils.lastDigit(price) % 2 != 0;},
							DIGITUNDER: function condition(barrier, price) {return utils.lastDigit(price) < parseInt(barrier);},
							DIGITOVER: function condition(barrier, price) {return utils.lastDigit(price) > parseInt(barrier);},
						},
						digitTrade : function digitTrade(contract) {
							if ( contract.type.indexOf( 'DIGIT' ) == 0 ) {
								return true;
							}
							return false;
						},
						getRelativeIndex : function getRelativeIndex(absoluteIndex, dataIndex) {
							return absoluteIndex - ( chartDrawer.getCapacity() - (chartDrawer.getPageTickCount() + chartDrawer.getDataIndex()) );
						},
						getAbsoluteIndex : function getAbsoluteIndex(relativeIndex, dataIndex) {
							return relativeIndex + ( chartDrawer.getCapacity() - (chartDrawer.getPageTickCount() + chartDrawer.getDataIndex()) );
						},
	 				};
			


			var Debouncer = function Debouncer(debouncingSteps) {
				var dragDirections = [];
				var consensus = function consensus() {
					var first = dragDirections[0],
							count = 0;
					dragDirections.forEach(function(direction){
						if (direction == first) {
							count++;
						}
					});
					if ( count == debouncingSteps ) {
						reset();
						return first;
					}
				};
				var reset = function reset() {
					dragDirections = [];
					for (var i = 0; i < debouncingSteps; i++) {
						dragDirections.push(i);
					}
				};
				var drag = function drag(direction) {
					dragDirections.push(direction);
					dragDirections.shift();
					return consensus();
				};
				return {
					drag: drag,
					reset: reset
				};
			};

			var LocalHistory = function LocalHistory(capacity){
				var historyData = []; 

				var addTick = function addTick(tick){
					historyData.push({
						time: tick.epoch,
						price: tick.quote
					});
					historyData.shift();
				};


				var updateHistoryArray = function updateHistoryArray(historyArray, history){
					var times = history.times, 
							prices = history.prices;
					times.forEach(function(time, index){
						historyArray.push({
							time: time,
							price: prices[index] 
						});
					});
				};
				var addHistory = function addHistory(history){
					historyData = [];
					updateHistoryArray(historyData, history);
				};
				
				var findElementByAttr = function findElementByAttr(array, attr, expected, compare) {
					if (!compare) {
						compare = function compare(a, b){
							return (a==b)?true:false;
						}
					}
					var foundIndex = -1;
					for (var i = 0; i < array.length; i++ ) {
						if (array[i].hasOwnProperty(attr) && compare(array[i][attr], expected)) {
							foundIndex = i;
						}
					}
					return foundIndex;
				};
			
				var addCandles = function addCandles(candles){
				};

				var addOhlc = function addOhlc (ohlc){
				};

				var getHistory = function getHistory(dataIndex, count, callback) {
					var end = capacity - dataIndex,
							start = end - count;
					if ( start >= 0 ) {
						callback( historyData.slice( start, end ) );
					} else {
						callback( [] );
					}
				};

				return {
					getHistory: getHistory, 
					addTick: addTick,
					addHistory: addHistory,
					addCandles: addCandles,
					addOhlc: addOhlc
				};

			};

			var Contract = function Contract(contract) {

				var resetSpotShowing = function resetSpotShowing() {
					contract.entrySpotShowing = false;
					contract.exitSpotShowing = false;
				};

				var entrySpotReached = function entrySpotReached() {
					if ( utils.isDefined( contract.entrySpotIndex ) ) {
						return true;
					} else {
						return false;
					}
				};

				var exitSpotReached = function exitSpotReached() {
					if ( utils.isDefined( contract.exitSpotIndex ) ) {
						return true;
					} else {
						return false;
					}
				};

				var betweenSpots = function betweenSpots(time) {
					if ( entrySpotReached() && time >= contract.entrySpot && ( !exitSpotReached() || time <= contract.exitSpot ) ) {
						return true;
					} else {
						return false;
					}
				};

				var nearSpots = function nearSpots(i) {
					if ( contract.entrySpotShowing && Math.abs( contract.entrySpotIndex - i ) == 1 ) {
						return true;
					}
					if ( contract.exitSpotShowing && Math.abs( contract.exitSpotIndex - i ) == 1 ) {
						return true;
					}
					return false;
				};
				
				var isSpot = function isSpot(i) {
					if ( contract.entrySpotShowing && contract.entrySpotIndex == i ) {
						return true;
					}
					if ( contract.exitSpotShowing && contract.exitSpotIndex == i ) {
						return true;
					}
					return false;
				};

				var isEntrySpot = function isEntrySpot(time) {
					if ( entrySpotReached() ) {
						if ( time == contract.entrySpot ) {
							return true;
						} else {
							return false;
						}
					} else {
						if ( time >= contract.startTime ) {
							return true;
						} else {
							return false;
						}
					}
				};

				var isExitSpot = function isExitSpot(time, index) {
					if ( exitSpotReached() ) {
						if ( time == contract.exitSpot ) {
							return true;
						} else {
							return false;
						}
					} else {
						if ( entrySpotReached() && index == contract.entrySpotIndex + contract.duration ) {
							return true;
						} else {
							return false;
						}
					}
				};
				
				var viewSpot = function viewSpot(index, tickTime) {
						if ( isEntrySpot( tickTime ) ) {
							contract.entrySpotShowing = true;
							if ( !utils.digitTrade(contract) && !exitSpotReached() ) { 
								chartDrawer.addGridLine({
									color: 'blue', 
									label: 'barrier: '+ contract.barrier, 
									orientation: 'horizontal', 
									index: index
								});
							}
							chartDrawer.addGridLine({
								color: 'red', 
								label: 'Entry Spot', 
								orientation: 'vertical', 
								index: index
							});
						} else if(isExitSpot(tickTime, utils.getAbsoluteIndex(index)) ) { 
							contract.exitSpotShowing = true;
							if ( contract.entrySpotShowing ) {
								chartDrawer.addGridLine({
									color: 'red', 
									label: 'Exit Spot', 
									orientation: 'vertical', 
									index: index
								});
							}
						}
				};

				var addSpot = function addSpot(index, tickTime, tickPrice) {
					if ( isEntrySpot(tickTime) || betweenSpots(tickTime) ) { 
						if ( isEntrySpot( tickTime ) ) {
							utils.setObjValue(contract, 'barrier', tickPrice);
							utils.setObjValue(contract, 'entrySpot', tickTime, !entrySpotReached());
						} else if(isExitSpot(tickTime, index) ) { 
							utils.setObjValue(contract, 'exitSpot', tickTime, !exitSpotReached());
						}
						utils.setObjValue(contract, 'entrySpotIndex', index, isEntrySpot( tickTime ));
						utils.setObjValue(contract, 'exitSpotIndex', index, isExitSpot( tickTime, index ));
					} 
				}; 

				var viewRegion = function viewRegion() {
					var color = (contract.result == 'win') ? 'rgba(0, 255, 0, 0.2)': 'rgba(255, 0, 0, 0.2)';
						if ( contract.exitSpotShowing ) {
							if ( utils.isDefined(contract.region) ){
								var start = utils.getRelativeIndex(contract.entrySpotIndex);
								contract.region.start = (start < 0)? 0 : start;
								contract.region.end = utils.getRelativeIndex(contract.exitSpotIndex);
								contract.region.color = color;
							}
							chartDrawer.addRegion(contract.region);
						} else if ( contract.entrySpotShowing ) {
							if ( !utils.isDefined(contract.region) ){
								contract.region = {
									color: color,
									start: utils.getRelativeIndex(contract.entrySpotIndex),
								};
							} else {
								contract.region.start = utils.getRelativeIndex(contract.entrySpotIndex);
								contract.region.color = color;
							}
							chartDrawer.addRegion(contract.region);
						} else {
							chartDrawer.removeRegion(contract.region);
						}
				};

				var viewRegions = function viewRegions() {
					if ( entrySpotReached() ) { 
						viewRegion();
					}
				};

				var addRegions = function addRegions(lastTime, lastPrice) {
					if ( entrySpotReached() ) { 
						if ( betweenSpots(lastTime) ) {
							if ( utils.conditions[contract.type](contract.barrier, lastPrice) ) {
								contract.result = 'win';
							} else {
								contract.result = 'lose';
							}
						}
					}
				};

				return {
					isSpot: isSpot,
					betweenSpots: betweenSpots,
					nearSpots: nearSpots,
					resetSpotShowing: resetSpotShowing,
					addSpot: addSpot,
					addRegions: addRegions,
					viewSpot: viewSpot,
					viewRegions: viewRegions,
				};

			};

			var ChartDrawer = function ChartDrawer() {
				var dataIndex = 0, 
						canvas,
						ctx,
						chart,
						capacity = 600,
						maximumZoomOut = 15, 
						maximumZoomIn = 5, 
						dragging = false,
						zooming = false,
						updateDisabled = false,
						pageTickCount = maximumZoomOut,
						dragSteps = 1,
						debouncingSteps = 3,
						debouncer = Debouncer(debouncingSteps);

				debouncer.reset();

				var showPriceIf = function showPriceIf(result, v, condition) {
					utils.setObjValue(result, 'v', v, condition);
				};

				var reversedIndex = function reversedIndex(i) {
					return pageTickCount - 1 - i;
				};

				var lastElement = function lastElement(i){
					if ( reversedIndex(i) == 0 ) {
						return true;
					} else {
						return false;
					}
				};

				var zoomedOut = function zoomedOut(){
					if ( pageTickCount == maximumZoomOut ) {
						return true;
					} else {
						return false;
					}
				};

				var zoomedIn = function zoomedIn(){
					if ( pageTickCount == maximumZoomIn ) {
						return true;
					} else {
						return false;
					}
				};
				
				var distribute = function distribute(i) {
					var distance = Math.ceil(pageTickCount/maximumZoomIn);
					if ( reversedIndex(i) % distance == 0 ) { 
						return true;
					} else {
						return false;
					}
				};
	
				var collisionOccured = function collisionOccured(i){
					if ( zoomedIn() ){
						return false;
					}
					if ( distribute(i) ) { 
						var nearAnySpots = false;
						contracts.forEach(function(contract){
							if ( contract.nearSpots(utils.getAbsoluteIndex(i))	) {
								nearAnySpots = true;
							}
						});
						return nearAnySpots;
					} else {
						return true;
					}
				};
	
				var showingHistory = function showingHistory() {
					if ( dataIndex == 0 ) {
						return false;
					} else {
						return true;
					}
				}

				var getDotColor = function getDotColor(value, index) {
					var color;
					contracts.forEach(function(contract){
						if ( contract.betweenSpots( value ) ) {
							color = 'blue';
						}
					});
					if ( utils.isDefined(color) ) { 
						return color;
					}
					if (lastElement(index) && !showingHistory()){
						color = 'green';
					} else {
						color = 'orange';
					}
					return color;
				};

				var drawRegion = function drawRegion(region){
					var yHeight = this.scale.endPoint - this.scale.startPoint,
							length,	
							end,	
							start,	
							pointCount = this.datasets[0].points.length;
					start = this.datasets[0].points[region.start].x;
					if ( utils.isDefined(region.end) ) {
						end = this.datasets[0].points[region.end].x;
					} else {
						end = this.datasets[0].points[pointCount - 1].x;
					}
					length = end - start;
					this.chart.ctx.fillStyle = region.color;

					this.chart.ctx.fillRect(start, this.scale.startPoint, length, yHeight);
				};

				var drawLabel = function drawLabel(point, index){
					var result= {};
					var v = point.value;
					showPriceIf(result, v, (!showingHistory() && lastElement(index)) || (!zoomedOut() && !collisionOccured(index)));
					contracts.forEach(function(contract){
						showPriceIf(result, v, contract.isSpot(utils.getAbsoluteIndex(index)));
					});
					if ( utils.isDefined(result.v) ) {
						var ctx = this.chart.ctx;
						ctx.font = this.scale.font;
						ctx.fillStyle = this.scale.textColor
						ctx.textAlign = "center";
						ctx.textBaseline = "bottom";
						
						ctx.fillText(point.value, point.x, point.y - 10);
					}
				};

				var drawGridLine = function drawGridLine(gridLine) {
					var point = this.datasets[0].points[gridLine.index];
					var scale = this.scale;

					this.chart.ctx.beginPath();
					if ( gridLine.orientation == 'vertical' ) {
						this.chart.ctx.moveTo(point.x, scale.startPoint + 24);
						this.chart.ctx.strokeStyle = gridLine.color;
						this.chart.ctx.fillStyle = 'black';
						this.chart.ctx.lineTo(point.x, scale.endPoint);
						this.chart.ctx.stroke();
					
						this.chart.ctx.textAlign = 'center';
						this.chart.ctx.fillText(gridLine.label, point.x, scale.startPoint + 12);
					} else {
						this.chart.ctx.moveTo(scale.startPoint, point.y);
						this.chart.ctx.strokeStyle = gridLine.color;
						this.chart.ctx.fillStyle = 'black';
						this.chart.ctx.lineTo(this.chart.width, point.y);
						this.chart.ctx.stroke();
					
						this.chart.ctx.textAlign = 'center';
						var labelWidth = this.chart.ctx.measureText(gridLine.label).width;
						this.chart.ctx.fillText(gridLine.label, this.chart.width - labelWidth, point.y + 12);
					}
				};
	

				Chart.CustomScale = Chart.Scale.extend({
					initialize: function () {
						var longestText = function(ctx,font,arrayOfStrings){
							ctx.font = font;
							var longest = 0;
							Chart.helpers.each(arrayOfStrings,function(string){
								var textWidth = ctx.measureText(string).width;
								longest = (textWidth > longest) ? textWidth : longest;
							});
							return longest;
						};

						this.calculateXLabelRotation = function(){

							this.ctx.font = this.font;

							var firstWidth = this.ctx.measureText(this.xLabels[0]).width,
								lastWidth = this.ctx.measureText(this.xLabels[this.xLabels.length - 1]).width,
								firstRotated,
								lastRotated;


							this.xScalePaddingRight = lastWidth/2 + 3;
							this.xScalePaddingLeft = (firstWidth/2 > this.yLabelWidth + 10) ? firstWidth/2 : this.yLabelWidth + 10;

							this.xLabelRotation = 0;
							if (this.display){
								var originalLabelWidth = longestText(this.ctx,this.font,this.xLabels),
									cosRotation,
									firstRotatedWidth;
								this.xLabelWidth = originalLabelWidth;
								var xGridWidth = Math.floor(this.calculateX(1) - this.calculateX(0)) - 6;
							}
							else{
								this.xLabelWidth = 0;
								this.xScalePaddingRight = this.padding;
								this.xScalePaddingLeft = this.padding;
							}
						};
						Chart.Scale.prototype.initialize.apply(this, arguments);
					}
				});

				Chart.types.Line.extend({
					name: "LineChartSpots",
					initialize: function (data) {
						Chart.types.Line.prototype.initialize.apply(this, arguments);
					},
					draw: function () {
						Chart.types.Line.prototype.draw.apply(this, arguments);
						var parentChart = this;

						this.datasets.forEach(function (dataset) {
							dataset.points.forEach(function (point, index) {
								drawLabel.call(parentChart, point, index);
							});
						});
						
						if ( utils.isDefined(this.options.regions) ){
							this.options.regions.forEach(function(region){
								drawRegion.call(parentChart, region);
							});
						}

						if (utils.isDefined(this.options.gridLines)){
							this.options.gridLines.forEach(function(gridLine){
								drawGridLine.call(parentChart, gridLine);
							});
						}


					},
					buildScale: function (labels) {
						var helpers = Chart.helpers;
						var self = this;

						var dataTotal = function () {
							var values = [];
							self.eachPoints(function (point) {
								values.push(point.value);
							});

							return values;
						};
						var scaleOptions = {
							templateString: this.options.scaleLabel,
							height: this.chart.height,
							width: this.chart.width,
							ctx: this.chart.ctx,
							textColor: this.options.scaleFontColor,
							fontSize: this.options.scaleFontSize,
							fontStyle: this.options.scaleFontStyle,
							fontFamily: this.options.scaleFontFamily,
							valuesCount: labels.length,
							beginAtZero: this.options.scaleBeginAtZero,
							integersOnly: this.options.scaleIntegersOnly,
							calculateYRange: function (currentHeight) {
								var updatedRanges = helpers.calculateScaleRange(
								dataTotal(),
								currentHeight,
								this.fontSize,
								this.beginAtZero,
								this.integersOnly);
								helpers.extend(this, updatedRanges);
							},
							xLabels: labels,
							font: helpers.fontString(this.options.scaleFontSize, this.options.scaleFontStyle, this.options.scaleFontFamily),
							lineWidth: this.options.scaleLineWidth,
							lineColor: this.options.scaleLineColor,
							gridLineWidth: (this.options.scaleShowGridLines) ? this.options.scaleGridLineWidth : 0,
							gridLineColor: (this.options.scaleShowGridLines) ? this.options.scaleGridLineColor : "rgba(0,0,0,0)",
							padding: (this.options.showScale) ? 0 : this.options.pointDotRadius + this.options.pointDotStrokeWidth,
							showLabels: this.options.scaleShowLabels,
							display: this.options.showScale
						};

						if (this.options.scaleOverride) {
							helpers.extend(scaleOptions, {
								calculateYRange: helpers.noop,
								steps: this.options.scaleSteps,
								stepValue: this.options.scaleStepWidth,
								min: this.options.scaleStartValue,
								max: this.options.scaleStartValue + (this.options.scaleSteps * this.options.scaleStepWidth)
							});
						}

						this.scale = new Chart.CustomScale(scaleOptions);
					}
				});
	
				var drawChart = function drawChart(chartID){
					canvas = document.getElementById(chartID);
					if ( canvas !== null ) {
						ctx = canvas.getContext('2d');
					}
				};

				var chartData = {
					labels: [],
					datasets: [
						{
							strokeColor: "orange",
							pointColor: "orange",
							pointStrokeColor: "#fff",
							data: []
						}
					]
				};
				var chartOptions = {
					animation: false,
					bezierCurve : false,
					datasetFill : false,
					showTooltips: false,
					keepAspectRatio: false,
					scaleLabel: function(valueContainer){return ''},
				};

				if ( utils.isDefined(ctx) ) {
					chart = new Chart(ctx).LineChartSpots(chartData, chartOptions);
				}
				
				var findRegion = function findRegion(region){
					if ( utils.isDefined(chartOptions.regions) ) {
						return chartOptions.regions.indexOf(region);
					} else {
						return -1;
					}
				};			

				var addRegion = function addRegion(region){
					if ( !utils.isDefined(chartOptions.regions) ) {
						chartOptions.regions = [];
					}
					if ( findRegion(region) < 0 ) {
						chartOptions.regions.push(region);
					}
				};			

				var removeRegion = function removeRegion(region){
					var regionIndex = findRegion(region);
					if ( regionIndex >= 0) {
						chartOptions.regions.splice(regionIndex, 1);
					}
				};			

				var dragStart = function dragStart(){
					debouncer.reset();
					dragging = true;
				};

				var dragEnd = function dragEnd(){
					debouncer.reset();
					dragging = false;
				};

				var zoomStart = function zoomStart(){
					zooming = true;
				};

				var zoomEnd = function zoomEnd(){
					zooming = false;
				};

				var addGridLine = function addGridLine(gridLine) {
					if ( !utils.isDefined(chartOptions.gridLines) ) {
						chartOptions.gridLines = [];
					}
					chartOptions.gridLines.push(gridLine);
				}
			
				var setChartColor = function setChartColor(chart, labels) {
					chart.datasets[0].points.forEach(function(point, index){
						point.fillColor = getDotColor(labels[index], index);
					});
					chart.update();
				};
				
				var addArrayToChart = function addArrayToChart(labels, values) {
					chartData.labels = [];
					labels.forEach(function(label, index){
						if ( distribute(index) ) {
							chartData.labels.push(utils.getTickTime(label));
						} else {
							chartData.labels.push('');
						}
					});
					
					chartData.datasets[0].data = values;
					if ( utils.isDefined(ctx) ) {
						if ( utils.isDefined(chart) ) {
							chart.destroy();
						}
						chart = new Chart(ctx).LineChartSpots(chartData, chartOptions);
						setChartColor(chart, labels);
					}
				};

				var updateChart = function updateChart(ticks){
					chartOptions.gridLines = [];
					contracts.forEach(function(contract){
						contract.resetSpotShowing();
					});
					var times = [],
							prices = [];
					
					ticks.forEach(function(tick, index){
						var tickTime = parseInt(tick.time);
						contracts.forEach(function(contract){
							contract.viewSpot(index, tickTime);
						});
						times.push(tickTime);
						prices.push(tick.price);
					});

					contracts.forEach(function(contract){
						contract.viewRegions();
					});

					addArrayToChart(times, prices);
				};

				var updateContracts = function updateContracts(ticks){
					var lastTime,
							lastPrices;
					
					ticks.forEach(function(tick, index){
						var tickTime = parseInt(tick.time);
						var tickPrice = tick.price;
						contracts.forEach(function(contract){
							contract.addSpot(index, tickTime, tickPrice);
						});
						lastTime = parseInt(tick.time);
						lastPrice = tick.price;
					});

					contracts.forEach(function(contract){
						contract.addRegions(lastTime, lastPrice);
					});
				};
				
				var addTick = function addTick(tick){
					if (localHistory && !updateDisabled) {
						localHistory.addTick(tick);
						localHistory.getHistory(0, capacity, updateContracts);
						if ( dataIndex == 0 && !dragging && !zooming ) {
							localHistory.getHistory(dataIndex, pageTickCount, updateChart);
						} else {
							next(false);
						}
					}
				};

				var addHistory = function addHistory(history){
					if (!localHistory) {
						localHistory = LocalHistory(capacity);
					}
					localHistory.addHistory(history);
					localHistory.getHistory(0, capacity, updateContracts);
					localHistory.getHistory(dataIndex, pageTickCount, updateChart);
				};

				var addCandles = function addCandles(candles){
				};

				var addOhlc = function addOhlc (ohlc){
				};
					
				
				var zoomOut = function zoomOut(){
					if ( pageTickCount < maximumZoomOut ){
						pageTickCount++;						
						localHistory.getHistory(dataIndex, pageTickCount, updateChart);
					}
				};

				var zoomIn = function zoomIn(){
					if ( pageTickCount > maximumZoomIn ){
						pageTickCount--;						
						localHistory.getHistory(dataIndex, pageTickCount, updateChart);
					}
				};

				var first = function first(){
					dataIndex = 0;
					localHistory.getHistory(dataIndex, pageTickCount, updateChart);
				};

				var next = function next(update){
					if ( dataIndex + pageTickCount < capacity - dragSteps){
						dataIndex += dragSteps;
						if ( !utils.isDefined(update) ) {
							localHistory.getHistory(dataIndex, pageTickCount, updateChart);
						} else if (update) {
							localHistory.getHistory(dataIndex, pageTickCount, updateChart);
						}
					}
				};

				var dragRight = function dragRight() {
					if ( !zooming && debouncer.drag( 'right' ) ) {
						next();
					}
				};

				var dragLeft = function dragLeft() {
					if ( !zooming && debouncer.drag( 'left' ) ) {
						previous();
					}
				};

				var previous = function previous(update){
					if (dataIndex >= dragSteps ){
						dataIndex -= dragSteps;
						if ( !utils.isDefined(update) ) {
							localHistory.getHistory(dataIndex, pageTickCount, updateChart);
						} else if (update) {
							localHistory.getHistory(dataIndex, pageTickCount, updateChart);
						}
					}
				};

				var getCapacity = function getCapacity() {
					return capacity;
				};

				var getPageTickCount = function getPageTickCount() {
					return pageTickCount;
				};

				var getDataIndex = function getDataIndex() {
					return dataIndex;
				};

				var addContract = function addContract(_contract) {
					if (_contract) {
						if ( utils.digitTrade(_contract) ) {
							_contract.duration -= 1;
						}
						contracts.push(Contract(_contract));
						dataIndex = 0;
					}
				};

				var historyInterface = {
					addTick: addTick,
					addHistory: addHistory,
					addCandles: addCandles,
					addOhlc: addOhlc
				};

				return {
					dragStart: dragStart,
					dragEnd: dragEnd,
					zoomIn: zoomIn,
					zoomOut: zoomOut,
					zoomStart: zoomStart,
					zoomEnd: zoomEnd,
					first: first,
					dragRight: dragRight,
					dragLeft: dragLeft,
					getCapacity: getCapacity,
					getPageTickCount: getPageTickCount,
					getDataIndex: getDataIndex,
					addContract: addContract,
					historyInterface: historyInterface,
					addGridLine: addGridLine,
					addRegion: addRegion,
					removeRegion: removeRegion,
					drawChart: drawChart,
				};

			};

			var drawChart = function drawChart(chartID) {
				chartDrawer.drawChart(chartID);
			};
			chartDrawer = ChartDrawer();

			return {
				drawChart: drawChart,
				dragStart: chartDrawer.dragStart,
				dragEnd: chartDrawer.dragEnd,
				zoomIn: chartDrawer.zoomIn,
				zoomOut: chartDrawer.zoomOut,
				zoomStart: chartDrawer.zoomStart,
				zoomEnd: chartDrawer.zoomEnd,
				first: chartDrawer.first,
				dragRight: chartDrawer.dragRight,
				dragLeft: chartDrawer.dragLeft,
				getCapacity: chartDrawer.getCapacity,
				addContract: chartDrawer.addContract,
				historyInterface: chartDrawer.historyInterface
			};
	});

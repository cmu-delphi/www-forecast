forecast = {};
margin = {top: 10, right: 20, bottom: 50, left: 25}

function initalization(){
  determine_dim();
  forecast.system2014 =  'eb';
  forecast.system2015 = 'st';
  forecast.system = 'st';
  forecast.region = 'nat';
  var week;
  forecast.epiweek = forecast.start_end[forecast.system].last;
  forecast.season = 2015;
  forecast.year = moment(forecast.epiweek, "YYYYWW").year();
  forecast.showConfidenceIntervals = false;
  forecast.valid52Weeks = []; //For any past season with 52 weeks

  $("#system_dropdown_2014").hide();
  for (var i = 0; i < 30; i++){
    forecast.valid52Weeks.push(((41 + i) % 52) + 1);
  }
  forecast.valid53Weeks = []; //For any past season with 53 weeks
  for (var i = 0; i < 31; i++){
    forecast.valid53Weeks.push(((41 + i) % 53) + 1);
  }
  forecast.validLiveWeeks = {};
  var liveSystems = {"st":"", "af":"", "ec":""};
  for (var system in liveSystems){
    forecast.validLiveWeeks[system] = [];
    var total;
    var epiweek = forecast.start_end[system].last;
    var first = 42;
    if (moment(epiweek, "YYYYWW").week() < 21){
      total = weeksInYear(moment(forecast.epiweek, "YYYYWW").subtract(1, 'years').year()) - first;
      total += forecast.start_end[system].last % 100;
      forecast.year = moment(forecast.epiweek, "YYYYWW").subtract(1, 'years').year()
    }
    else{
      total = (epiweek % 100) - first + 1;
      forecast.year = moment(forecast.epiweek, "YYYYWW").year();
    }
    for (var i = 0; i < total; i++){
      forecast.validLiveWeeks[system].push((first + i) % weeksInYear(forecast.year) + 1);
    }
  }
  forecast.weeks = forecast.validLiveWeeks[forecast.system];
  forecast.weeksIndex = forecast.weeks.length - 1;
  forecast.max_height = {
    "nat" : 8,
    "hhs1" : 6,
    "hhs2" : 6,
    "hhs3" : 10,
    "hhs4" : 10,
    "hhs5" : 9,
    "hhs6" : 12,
    "hhs7" : 9,
    "hhs8" : 7,
    "hhs9" : 10,
    "hhs10" : 10
  }
}

function determine_dim(){
  width = Math.round(window.innerWidth * 0.66) - margin.left - margin.right;
  height = Math.round(window.innerHeight * 0.73) - margin.top - margin.bottom;
  min_height = 400;
  min_width = 550;
  max_height = 500;
  max_width = 800;
  
  if (width < min_width)
    width = min_width;
  if (height < min_height)
    height = min_height;
  if (width > max_width)
    width = max_width;
  if (height > max_height)
    height = max_height;
}

function main(){
  plotChart = d3.select('#chart')
                    .append('svg')
                    .attr('id', 'main_chart')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}


function createLegend(){
  var xLoc = width - 100;

  plotChart.append("circle")
        .attr("cx", xLoc - 15)
        .attr("cy", 20)
        .attr("r", 4)
        .attr("fill", "black")
        .attr("class", "perm");

  plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 22.5)
        .text("Actual")
        .attr("fill", "black")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

  plotChart.append("circle")
        .attr("cx", xLoc - 15)
        .attr("cy", 50)
        .attr("r", 4)
        .attr("fill", "green")
        .attr("class", "perm");

  plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 52.5)
        .text("Predicted")
        .attr("fill", "black")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

  plotChart.append("text")
        .attr("x", xLoc - 15)
        .attr("y", 85)
        .text("X")
        .attr("fill", "green")
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("class", "perm");

  plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 82)
        .text("Predicted Peak")
        .attr("fill", "black")
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");
}


//Given week and season where season is the earlier year in the season
//determine year
function determineYear(week, season){
  if (week < 21){
    return moment(season, "YYYY").add(1, 'years').year();
  }
  else{
    return season;
  }
}

//Given week and year return season where season is earlier year in season
function determineSeason(week, year){
  if (week < 21){
    return moment(year, "YYYY").subtract(1, 'years').year();
  }
  else{
    return year;
  }
}

//Changes the week of the forecast. Function called when left and right keys
//are pressed
function changeWeek(change){
  //Don't change week if at the bounds
  if (forecast.weeksIndex + change < 0 ||
    forecast.weeksIndex + change >= forecast.weeks.length){
    return;
  }
  //Otherwise shift over in the right direction
  
  else{
    forecast.weeksIndex += change;
    var week = forecast.weeks[forecast.weeksIndex];
    if (week < 10){
      week = "0" + week.toString();
    }
    forecast.year = parseInt(determineYear(week, forecast.season));
    forecast.epiweek = forecast.year.toString() + week.toString();
  }
  loadData();
}

function showConfidenceIntervals(checked){
  forecast.showConfidenceIntervals = checked;
  loadData();
}

function determineEpiWeek(){
  var week = parseInt(forecast.epiweek) % 100;
  var year;
  for (var i = 0; i < forecast.weeks.length; i++){
    if (week == forecast.weeks[i]){
      if (week < 21){
        year = (parseInt(forecast.season) + 1).toString();
      }
      else{
        year = parseInt(forecast.season);
      }
      if (week < 10){
        week = "0" + week.toString();
      }
      else{
        week = week.toString();
      }
      forecast.epiweek = year + week;
      forecast.weeksIndex = i;
      return;
    }
  }
  forecast.epiweek = forecast.start_end[forecast.system].last;
  forecast.weeksIndex = forecast.weeks.length - 1;
}

function changeSeason(season){
  forecast.season = season;
  if (season == 2014){
    $("#system_dropdown_2015").hide()
    $("#system_dropdown_2014").show()
  }
  else if (season == 2015){
    $("#system_dropdown_2014").hide()
    $("#system_dropdown_2015").show()
  }
  if (forecast.season == determineSeason(moment().week(), moment().year())){
    forecast.system2014 = forecast.system;
    forecast.system = forecast.system2015;
    forecast.weeks = forecast.validLiveWeeks[forecast.system];
    forecast.year = moment().year();
  }
  else{
    if (weeksInYear(forecast.season) == 52){
      forecast.weeks = forecast.valid52Weeks;
    }
    else{
      forecast.weeks = forecast.valid53Weeks;
    }
    forecast.system2015 = forecast.system;
    forecast.system = forecast.system2014;
  }
  determineEpiWeek();
  loadData();
}

function changeSystem(system){
  forecast.system = system;
  if (forecast.season == determineSeason(moment().week(), moment().year())){
    forecast.weeks = forecast.validLiveWeeks[forecast.system];
  }
  determineEpiWeek();
  loadData();
}

function changeRegion(value){
  forecast.region = value;
  loadData();
}

function getChartTitle(){
  if (forecast.region == "nat")
    region = "National"
  else
    region = "Region " + forecast.region.replace("hhs", "")
  year = forecast.season.toString() + "-" + (parseInt(forecast.season) + 1).toString()
  return (region + " Influenza Forecast, " + year)
}

function getSubChartTitle(){
  week = forecast.epiweek % 100;
  result = "Prediction Week: " + week.toString();
  if (forecast.season == determineSeason(moment().week(), moment().year())){
    if (forecast.epiweek == forecast.start_end[forecast.system].last)
      result = result + " (Latest Available)";
  }
  return result;
}

function weekButtonControl(){
  $("body").keydown(function(e) {
    if(e.keyCode == 37) {
      changeWeek(-1);
    }
    else if(e.keyCode == 39) {
      changeWeek(1);
    }
  });
}

function loadData(){
  $("#chart_title").text(getChartTitle())
  $("#chart_subtitle").text(getSubChartTitle());
  Epidata.delphi(function(result, info, data) {
    if (!result) {
      // If loading fails, `data` is a string with the reason
      alert('ForecastLoader says: ' + data);
      return;
    }
    else{
      var start = forecast.season.toString() + "40";
      var end;
      if (forecast.season == determineSeason(moment().week(), moment().year())){
        end = forecast.start_end[forecast.system].last;
      }
      else{
        end = moment(forecast.season, "YYYY").add(1, 'years').year().toString() + "21";
      }
      Epidata.fluview(function(result, info, past_data){
        if (!result){
          alert('ForecastLoader says: ' + data);
        }
        else{
          processData(data, past_data);
        }
      }, forecast.region, Epidata.range(start, end),
          issues = end);
    }
  }, forecast.system, forecast.epiweek);
}

var parseDate = d3.time.format("%Y %W").parse;

function determineInterval(data, bin_size, point){
  var index = 0;
  var area = 0;
  var accuracy = 0.0001;
  while (area < 0.1){
    area += data[Math.floor(index)] * accuracy;
    index += accuracy;
  }
  var lower_bound = index;
  area = 0;
  index = data.length - accuracy;
  while (area < 0.1){
    area += data[Math.floor(index)] * accuracy
    index -= accuracy;
  }
  var upper_bound = index;
  //Dealing with highest bin being infinity
  if (Math.floor(upper_bound) == data.length - 1){
    var infinity_bin_size = 2.5;
    upper_bound += (upper_bound % 1) * infinity_bin_size
  }
  result = [(lower_bound * bin_size), (upper_bound * bin_size)];
  return result;
}

function getWeek(epiweek){
  epiweek = epiweek.toString();
  if(epiweek.length == 5){
    var week = parseInt(epiweek.toString().substring(4,5));
  }
  else{
    var week = parseInt(epiweek.toString().substring(4,6));
  }
  if (week < 30){
    week += parseInt(weeksInYear(forecast.season));
  }
  return week;
}

function processData(full_data, trendline){
  var data = full_data[0].forecast.data[forecast.region];
  var ili_bin_size = full_data[0].forecast.ili_bin_size;
  var ili_bins = full_data[0].forecast.ili_bins;
  var lines = {};
  forecast.baselines = full_data[0].forecast.baselines;
  forecast.num_weeks = full_data[0].forecast.year_weeks;
  lines.trendline = [];
  for (var i = 0; i < trendline.length; i++){
      var week = getWeek(trendline[i].epiweek);
      lines.trendline.push([week, trendline[i].wili]);
  }
  lines.forecast = [];
  lines.confidenceInterval = []
  for (var i = 0; i < trendline.length; i++){
    if (trendline[i].epiweek == forecast.epiweek){
      var temp = getWeek(trendline[i].epiweek);
      lines.forecast.push([temp, trendline[i].wili]);
      lines.confidenceInterval.push({"x": temp, "lower" : trendline[i].wili, "upper" : trendline[i].wili});
      break;
    }
  }
  var xs = ["x1","x2","x3","x4"];
  var week = parseInt(forecast.epiweek.toString().substring(4,6));
  for (i = 0; i < xs.length; i++){
    var datapoint = data[xs[i]];
    var interval = determineInterval(datapoint.dist, ili_bin_size, datapoint.point)
    var date = getWeek(forecast.season + (week + i + 1).toString());
    lines.forecast.push([date, datapoint.point]);
    forecast.season = forecast.season.toString();
    lines.confidenceInterval.push({"x" : getWeek(forecast.season + date), "lower" : interval[0], "upper" : interval[1]});
  }
  var peakweek = data.peakweek.point;
  var peakweek_year = determineYear(parseInt(data.peakweek.point), parseInt(forecast.season));
  var peakweek = getWeek(peakweek_year.toString() + peakweek.toString());
  lines.peak = [peakweek, data.peak.point];
  var peakweek_point;
  if (data.peak.point < 21)
    peakweek_point = (weeksInYear(forecast.season) - 40) + data.peak.point;
  else
    peakweek_point = data.peak.point - 40;
  var ili_interval = determineInterval(data.peak.dist, ili_bin_size, data.peak.point);
  var week_interval = determineInterval(data.peakweek.dist, 1, peakweek_point);
  week_interval[0] = (39 + week_interval[0])
  week_interval[1] = (39 + week_interval[1])
  lines.peak_time_interval = [[week_interval[0],data.peak.point], [week_interval[1], data.peak.point]];
  lines.peak_ili_interval = [[peakweek, ili_interval[0]], [peakweek, ili_interval[1]]];
  visualizeData(lines);
}

function visualizeData(lines){
  plotChart.selectAll(".x-axis").remove();
  plotChart.selectAll(".y-axis").remove();
  plotChart.selectAll(".line").remove();
  plotChart.selectAll(".confidence").remove();
  plotChart.selectAll("circle").remove();
  plotChart.selectAll("rect").remove();
  plotChart.selectAll("text").remove();
  plotChart.selectAll("line").remove();

  createLegend();

  var confidenceArea = d3.svg.area()
                .interpolate("linear")
                .x(function(d) { return xScale(d.x); })
                .y0(function(d) {
                    return yScale(d.lower); })
                .y1(function(d) {
                    return yScale(d.upper); });

  var season = parseInt(forecast.season);
  var end = weeksInYear(season) + 29;

  var xScale = d3.scale.linear()
                       .domain([30, end])
                       .range([0, width]);

  var xScaleTime = d3.time.scale()
                 .domain([moment(season.toString() + "30", "YYYYWW"), 
                    moment((season + 1).toString() + "29", "YYYYWW")])
                 .range([0, width]);

  var yScale = d3.scale.linear()
                 .domain([0, forecast.max_height[forecast.region]])
                 .range([height, 0]);

  var xAxisWeek = d3.svg.axis()
                    .scale(xScale)
                    .ticks((end - 30) / 2)
                    .tickFormat(function(x){return ((x - 1) % (weeksInYear(season))) + 1})
                    .orient('bottom')

  var xAxisMonth = d3.svg.axis()
                    .scale(xScaleTime)
                    .tickSize(5, 0)
                    .ticks(d3.time.months)
                    .tickFormat(d3.time.format("%b"))
                    .orient('bottom')

  var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient('left');

  plotChart.append('g')
           .attr('class', 'x-axis')
           .attr('transform', 'translate(0,' + height + ')')
           .call(xAxisWeek)
         .append("text")
           .attr("class", "label")
           .attr("x", width)
           .attr("y", -6)
           .style("text-anchor", "end")
           .text("Epi Week");
  
  var axisShift = Math.round(height * 0.05);
  var monthShift = Math.round(width * 0.04);

  plotChart.append('g')
           .attr('class', 'x-axis')
           .attr('transform', 'translate(0,' + (height + axisShift) + ')')
           .call(xAxisMonth)
           .selectAll("text")
              .attr("transform", "translate(" + monthShift + ", 0)" )
              .last().remove();

  plotChart.append('g')
           .attr('class', 'y-axis')
           .call(yAxis)
         .append("text")
           .attr("class", "label")
           .attr("transform", "rotate(-90)")
           .attr("y", 7)
           .attr("x", -3)
           .attr("dy", ".72em")
           .style("text-anchor", "end")
           .text("% Weighted ILI");

   var pastXValue = xScale(lines.forecast[0][0]);
   var widthValue = width - Math.abs(pastXValue - width);

   var pastRect = plotChart.append('g');

   pastRect.append("rect")
           .attr("width", widthValue)
           .attr("height", height)
           .attr("fill", "grey")
           .attr("opacity", "0.2")

    pastRect.append("text")
            .attr("class", "label")
            .attr("y", 5)
            .attr("x", widthValue - 5)
            .attr("dy", ".72em")
            .style("text-anchor", "end")
            .text("< Past");

    pastRect.append("text")
            .attr("class", "label")
            .attr("y", 5)
            .attr("x", widthValue + 5)
            .attr("dy", ".72em")
            .style("text-anchor", "start")
            .text("Future >");

  var line = d3.svg.line()
               .x(function(d) {
                 return xScale(d[0]);
                })
               .y(function(d) {
                 return yScale(d[1]);
                })
               .interpolate("linear");

  if (forecast.showConfidenceIntervals){
    plotChart.append("path")
             .datum(lines.confidenceInterval)
             .attr("class", "confidence")
             .attr("d", confidenceArea)
             .attr("stroke", "")
             .attr("fill", "#33CC33")
             .attr("opacity", "0.25")

    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]))
             .attr("x2", xScale(lines.peak_ili_interval[1][0]))
             .attr("y1", yScale(lines.peak_ili_interval[0][1]))
             .attr("y2", yScale(lines.peak_ili_interval[1][1]))
             .attr("stroke", "green")
             .attr("stroke-width", "3");
    
    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[0][0]))
             .attr("x2", xScale(lines.peak_time_interval[1][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]))
             .attr("y2", yScale(lines.peak_time_interval[1][1]))
             .attr("stroke", "green")
             .attr("stroke-width", "3");
    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]) - 5)
             .attr("x2", xScale(lines.peak_ili_interval[1][0]) + 5)
             .attr("y1", yScale(lines.peak_ili_interval[0][1]))
             .attr("y2", yScale(lines.peak_ili_interval[0][1]))
             .attr("stroke", "green")
             .attr("stroke-width", "3");

    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]) - 5)
             .attr("x2", xScale(lines.peak_ili_interval[1][0]) + 5)
             .attr("y1", yScale(lines.peak_ili_interval[1][1]))
             .attr("y2", yScale(lines.peak_ili_interval[1][1]))
             .attr("stroke", "green")
             .attr("stroke-width", "3");

    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[0][0]))
             .attr("x2", xScale(lines.peak_time_interval[0][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]) - 5)
             .attr("y2", yScale(lines.peak_time_interval[1][1]) + 5)
             .attr("stroke", "green")
             .attr("stroke-width", "3");

    plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[1][0]))
             .attr("x2", xScale(lines.peak_time_interval[1][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]) - 5)
             .attr("y2", yScale(lines.peak_time_interval[1][1]) + 5)
             .attr("stroke", "green")
             .attr("stroke-width", "3");

  }

  plotChart.append("path")
           .datum(lines.trendline)
           .attr("class", "line")
           .attr("d", line)
           .attr("stroke", "black")

  plotChart.append("path")
           .datum(lines.forecast)
           .attr("class", "line")
           .attr("d", line)
           .attr("stroke", "green")
  
  plotChart.append("text")
           .attr("x", xScale(lines.peak[0]))
           .attr("y", yScale(lines.peak[1]) + 8.5)
           .text("X")
           .attr("fill", "green")
           .attr("font-size", "24px")
           .attr("text-anchor", "middle")
           .attr("font-weight", "bold");

  plotChart.append("svg:line")
           .attr("x1", 0)
           .attr("x2", width)
           .attr("y1", yScale(forecast.baselines[forecast.region]))
           .attr("y2", yScale(forecast.baselines[forecast.region]))
           .style("stroke", "black")
           .style("stroke-opacity", 0.8)
           .style("stroke-dasharray", ("3, 3"))

  var circleData = []
  var temp;
  //Hack to fix circle issue
  if (lines.trendline.length > 2){
    for (i = 0; i < 2; i++){
      temp = lines.trendline[i];
      temp.push("black");
      circleData.push(temp);
    }
  }
  for (i = 0; i < lines.trendline.length; i++){
    temp = lines.trendline[i];
    temp.push("black");
    circleData.push(temp);
  }
  for (i = 1; i < lines.forecast.length; i++){
    temp = lines.forecast[i];
    temp.push("green");
    circleData.push(temp);
  }
  
  plotChart.selectAll("circle")
           .data(circleData)
           .enter()
           .append("circle")
           .attr("cx", function(d) { return xScale(d[0]); })
           .attr("cy", function(d) { return yScale(d[1]); })
           .attr("fill", function(d) { return d[2]; })
           .attr("r", 2.5);

}

$(document).ready(function(){
  Epidata.meta(function(a, b, data){
    forecast.start_end = {}
    data = data[0].delphi;
    for (var i = 0; i < data.length; i++){
      forecast.start_end[data[i].system] = {"first": data[i].first_week, 
      "last": data[i].last_week, "weeks": data[i].num_weeks};
    }
    initalization();
    script_on_page();
    main();
    weekButtonControl();
    loadData();
  });
});

function script_on_page(){
  $(".dropdown-menu li a").click(function(){
    $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
    $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
  });
  /*
  $("#season_dropdown").change(function(){
    $("#system_dropdown option").hideOption();
    $("#system_dropdown").find("option[rel*='" + this.value + "']").showOption();
  }).change();*/
  
  $('[data-toggle="tooltip"]').tooltip(); 
}

d3.selection.prototype.first = function() {
return d3.select(this[0][0]);
};
d3.selection.prototype.last = function() {
var last = this.size() - 1;
return d3.select(this[0][last]);
};

function getWeekNumber(d) {
  // Copy date so don't modify original
  d = new Date(+d);
  d.setHours(0,0,0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  // Get first day of year
  var yearStart = new Date(d.getFullYear(),0,1);
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7)
  // Return array of year and week number
  return [d.getFullYear(), weekNo];
}

function weeksInYear(y) {
  y = y.toString();
  if (y == "2014")
    return 53;
  else
    return 52;
}

$.fn.showOption = function() {
this.each(function() {
    if( this.tagName == "OPTION" ) {
        var opt = this;
        if( $(this).parent().get(0).tagName == "SPAN" ) {
            var span = $(this).parent().get(0);
            $(span).replaceWith(opt);
            $(span).remove();
        }
        opt.disabled = false;
        $(opt).show();
    }
});
return this;
}

$.fn.hideOption = function() {
this.each(function() {
    if( this.tagName == "OPTION" ) {
        var opt = this;
        if( $(this).parent().get(0).tagName == "SPAN" ) {
            var span = $(this).parent().get(0);
            $(span).hide();
        } else {
            $(opt).wrap("span").hide();
        }
        opt.disabled = true;
    }
});
return this;
}

$( window ).resize(function() {
  determine_dim();
  $("#main_chart").remove();
  main();
  loadData();
});

$(document).on('keydown', 'select', function(event) {
    var value = $(this).find('option:selected').val();
    if ((event.which == 37 || event.which === 39)) {
        setTimeout(function (obj, val) {
                return function() {
                    obj.find('option[value="' + val + '"]').prop("selected", true)
                }
        }($(this), value), 0);
    }
});

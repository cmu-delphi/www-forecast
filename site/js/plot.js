// global forecast instance contains all controlling parameters
var forecast = {
    // season object that contains season's meta info
    season:null,
    // contains the delphi system displayed
    sys:null,
    // current epiweek(at point of prediction)
    epiweek:null,
    // current region/state
    region:null,
    showConfidenceIntervals:null,
    // max for y axis in different regions
    max_height:null,
};

// parameters for ui
margin = {top: 10, right: 20, bottom: 50, left: 25};

// Green #008C44 #00783A
// Yellow #FAFF61 #FAD400
// Blue #68C8F7 #1499DB
predict_line_color = "#FAFF61";
predict_circle_color = "#FAD400";
actual_line_color = "#14B2FF";
actual_circle_color = "#1499DB";
text_color = "#ccc";
latest_ili_color = "#ccc";
conf_area_color = "#FCFF9C";
onset_color = "#FFA85C";

// forecast system object
var sysObj = function(id,name,startWeek,endWeek,hasStateLevel,extraRegions){
    this.id = id;
    this.name = name;
    this.startWeek = startWeek;
    this.endWeek = endWeek;
    this.hasStateLevel = hasStateLevel;
    this.extraRegions = extraRegions;
}

// hard-coded current season (starting year)
var curr_season = 2017;
var plotChart;
// season meta information
var season_meta = new Map([
    [
      2014,
      {
        year:2014,
        sys:[
            new sysObj('eb','Empirical Bayes',201441,201519,false,[]),
            new sysObj('ec','Epicast',201441,201519,false,[]),
            new sysObj('sp','Spline',201441,201519,false,[])
        ],
        // Need to change
        lastWeekInYear: 201453,
        iliCoverage:[201439,201521]
      }
    ],
    [
      2015,
      {
        year:2015,
        sys:[
            new sysObj('st','Stat',201542,201619,false,[]),
            new sysObj('af','Archefilter',201541,201619,false,[]),
            new sysObj('ec','Epicast',201541,201619,false,[])
        ],
        lastWeekInYear: 201552,
        iliCoverage:[201539,201621]

      }
    ],
    [
      2016,
      {
        year:2016,
        sys:[
            new sysObj('st','Stat',201643,201718,false,[]),
            new sysObj('ec','Epicast',201643,201718,false,[])
        ],
        lastWeekInYear: 201652,
        iliCoverage:[201641,201721]
      }
    ],
    [
      2017,
      {
        year:2017,
        sys:[
            new sysObj('ec','Epicast',201743,201820,false,['PA','DC','GA']),
            //new sysObj('st','Stat',201743,201820,false,[])
        ],
        lastWeekInYear: 201752,
        iliCoverage:[201741,201821]
      }
    ]
]);

// Read in meta data and initialize the tool
$(document).ready(function(){
    $(':button').prop('disabled', true);
    $('option').attr('disabled','disabled');
    addLoaderAnim();
    Epidata.meta(function(a, b, data){
        setCurrentSeason(data);
        // initialize for the second time to load current season info
        initialization();
        //script_on_page();
        reloadChart();
        weekButtonControl();
        loadData();
        $(':button').prop('disabled', false);
        $('option').removeAttr('disabled');
        removeLoaderAnim();
    });
});

// using the meta data to check latest available prediction
function setCurrentSeason(data){
    var latest_season = season_meta.get(curr_season);
    var flu_latest_issue = data[0].fluview[0].latest_issue;
    var data_delphi = data[0].delphi;
    latest_season.iliCoverage[1] =
        Math.min(flu_latest_issue,latest_season.iliCoverage[1]);

    for (var i in data_delphi) {
        var sys = data_delphi[i].system;
        for (var j in latest_season.sys){
            if (sys == latest_season.sys[j].id){
                latest_season.sys[j].endWeek = Math.min(
                    latest_season.sys[j].endWeek, data_delphi[i].last_week
                );
                break;
            }
        }
    }
    season_meta.set(curr_season,latest_season);
};

function initialization(){
    // initialize doc size
    determineCanvas();

    // init vis parameters
    // set season to latest one
    forecast.season = season_meta.get(curr_season);
    forecast.sys = forecast.season.sys[0];
    forecast.epiweek = forecast.sys.endWeek;
    forecast.location = 'nat';
    forecast.showConfidenceIntervals = true;

    forecast.max_height_default = 10;
    forecast.max_height = {
        "nat" : 8,
        "hhs1" : 6,
        "hhs2" : 10,
        "hhs3" : 10,
        "hhs4" : 10,
        "hhs5" : 9,
        "hhs6" : 12,
        "hhs7" : 9,
        "hhs8" : 7,
        "hhs9" : 10,
        "hhs10" : 10
    }

    setSeasonDropdown();
    setSystemDropdown();
    setExtraRegionDropdown();
}

function isState(location){
    var loc = location.toUpperCase();
    return mapInfo.states.indexOf(loc)>=0;
}

// Callback functions for dropdowns
function changeWeek(change){
    //Don't change week if at the bounds
    if (forecast.epiweek + change < forecast.sys.startWeek || forecast.epiweek + change > forecast.sys.endWeek){
        return;
    }
    //Otherwise shift over in the right direction
    else{
        forecast.epiweek += change;
        if(forecast.epiweek%100>forecast.season.lastWeekInYear%100){
            forecast.epiweek = forecast.epiweek-forecast.epiweek%100+101;
        }
        else if(forecast.epiweek%100==0){
            forecast.epiweek = forecast.season.lastWeekInYear;
        }
    }

    loadData();
}

function showConfidenceIntervals(checked){
    forecast.showConfidenceIntervals = checked;
    loadData();
}

function changeSeason(season,reload=true){
    season = parseInt(season);
    forecast.season = season_meta.get(season);
    // Set system
    forecast.epiweek = season*100+41;
    var curr_sys = forecast.sys.id;
    var curr_loc = forecast.location;
    changeSystem(curr_sys,false);
    if (
        mapInfo.regions.indexOf(curr_loc.toUpperCase())==-1
        && forecast.sys.extraRegions.indexOf(curr_loc.toUpperCase())==-1
    ){
        forecast.location = mapInfo.regions[0].toLowerCase();
        mapObj.activeRegion = mapInfo.regions[0];
        mapObj.activeLocation = mapInfo.regions[0];
        mapObj.colorMap();
        setRegionDropdownText();
    }
    if(season == curr_season){
        forecast.epiweek = forecast.sys.endWeek;
    }
    // change the dropdown
    setSystemDropdown();
    if (reload){
        loadData();
    }
}

function changeSystem(system_id,reload=true){
    // Set to default first
    forecast.sys = null;
    for (var i in forecast.season.sys){
        var sys = forecast.season.sys[i];
        if (sys.id==system_id){
            forecast.sys = sys;
            break;
        }
    }
    if (forecast.sys == null){
        forecast.sys = forecast.season.sys[0];
    }
    // Check whether epiweek is in range
    forecast.epiweek = Math.max(forecast.epiweek,forecast.sys.startWeek);
    forecast.epiweek = Math.min(forecast.epiweek,forecast.sys.endWeek);

    setStateDropdown();
    setExtraRegionDropdown();
    if (reload){
        loadData();
    }
}

function changeLocation(value){
    forecast.location = value;
    loadData();
}

function getChartTitle(){
    if (forecast.location == "nat"){
        region = "National";
    }
    else if(forecast.location.search("hhs")!=-1){
        region = "Region " + forecast.location.replace("hhs", "");
    }
    else {
        region = mapInfo.stateNames.get(forecast.location.toUpperCase());
    }
    year = forecast.season.year.toString() + "-" + (forecast.season.year + 1).toString();
    return (region + " Influenza Forecast, " + year)
}

function getSubChartTitle(){
    return "Prediction Week: "+(Math.floor(forecast.epiweek/100))+"wk"+(forecast.epiweek%100);
}

function loadData(){
    $("#chart_title").text(getChartTitle());
    $("#chart_subtitle").text(getSubChartTitle());
    var start = forecast.season.iliCoverage[0];
    var end = forecast.season.iliCoverage[1];
    var forecast_data, curr_ili, latest_ili;
    var y, issue_time;

    // check whether stable wili is available
    if(forecast.season.year==curr_season){
        issue_time = null;
    }
    else{
        y = forecast.season.year+1;
        issue_time = y*100+30;
    }

    var load_forecast = Epidata.delphi(
        function(result, info, data) {
            if (!result) {
                // If loading fails, `data` is a string with the reason
                alert('ForecastLoader says: ' + data)
            }
            else{
                forecast_data = data;
            }
        },
        forecast.sys.id, forecast.epiweek
    );

    var load_latest, load_current;
    load_latest = Epidata.fluview(
        function(result, info, latest_issue){
            if (!result){
                alert('ForecastLoader says: ' + result);
            }
            else{
                latest_ili = latest_issue;
            }
        },
        forecast.location, Epidata.range(start, end), issues = issue_time
    );

    load_current = Epidata.fluview(
        function(result, info, curr_issue){
            if (!result){
                alert('ForecastLoader says: ' + result);
            }
            else{
                curr_ili = curr_issue;
            }
        },
        forecast.location, Epidata.range(start, end),issues = forecast.epiweek
    );
    // load data in parallel
    Promise.all([load_forecast, load_latest, load_current]).then(function(){
        processData(forecast_data, curr_ili, latest_ili);
    });
}

// Data parsing functions
function determineYear(week, season){
    if (week < 21){
        return moment(season, "YYYY").add(1, 'years').year();
    }
    else{
        return season;
    }
}

function weeksInYear(y) {
    if ([4, 9, 15, 20, 26].indexOf(y%28)>=0){
        return 53;
    }
    return 52;
}

function determineInterval(data, bin_size, point){
    var precision = 0.75;
    var centerBin = Math.floor(point/bin_size);
    var sum = 0;
    for (var i in data){
        sum += data[i];
    }
    var accuProb = data[centerBin]/sum;
    var l_step = 1;
    var r_step = 1;
    var last_dir = -1; // 0 if moved left; 1 if moved right
    while(accuProb<precision){
        // add a bin from left or right
        if(centerBin-l_step>=0
        &&(centerBin+r_step>=data.length || data[centerBin-l_step]>=data[centerBin+r_step]) ){
            // Move left
            accuProb += data[centerBin-l_step]/sum;
            l_step += 1;
            last_dir = 0;
        }
        else{
            // Move right
            accuProb += data[centerBin+r_step]/sum;
            r_step += 1;
            last_dir = 1;
        }
    }

    // Interpolation
    var lowerBound, upperBound;
    if(last_dir == -1){
        // Add interpolation for better effect
        lowerBound = centerBin+0.5-(precision/data[centerBin]);
        upperBound = centerBin+0.5+(precision/data[centerBin]);
    }
    else if(last_dir == 0){
        lowerBound = centerBin - l_step + 1 + (accuProb-precision)/data[centerBin - l_step + 1];
        upperBound = centerBin + r_step;
    }
    else{
        lowerBound = centerBin - l_step + 1;
        upperBound = centerBin + r_step - (accuProb-precision)/data[centerBin + r_step - 1];
    }
    var result = [(lowerBound * bin_size), (upperBound * bin_size)];
    return result;
}

// from natural week to week id (wk39-wk19? next year)
function peakweekCast(week, year){
    if(week<39){
        return week+weeksInYear(year)-39;
    }
    else{
        return week-39;
    }
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
        week += weeksInYear(forecast.season.year);
    }
    return week;
}

function processData(forecast_ili, curr_ili, latest_ili){
    var data = forecast_ili[0].forecast.data[forecast.location];
    var ili_bin_size = forecast_ili[0].forecast.ili_bin_size;
    var ili_bins = forecast_ili[0].forecast.ili_bins;
    var lines = {};
    forecast.num_weeks = forecast_ili[0].forecast.season.year_weeks;
    // baselines for states will be null
    forecast.baselines = forecast_ili[0].forecast.baselines;

    lines.currIli = [];
    for (var i = 0; i < curr_ili.length; i++){
        var week = getWeek(curr_ili[i].epiweek);
        lines.currIli.push([week, curr_ili[i].wili]);
    }

    if(latest_ili!=null){
        lines.latestIli = [];
        for (var i = 0; i < latest_ili.length; i++){
            var week = getWeek(latest_ili[i].epiweek);
            lines.latestIli.push([week, latest_ili[i].wili]);
        }
    }

    lines.forecast = [];
    lines.confidenceInterval = []
    for (var i = 0; i < curr_ili.length; i++){
        if (curr_ili[i].epiweek == forecast.epiweek){
            var temp = getWeek(curr_ili[i].epiweek);
            lines.forecast.push([temp, curr_ili[i].wili]);
            lines.confidenceInterval.push({"x": temp, "lower" : curr_ili[i].wili, "upper" : curr_ili[i].wili});
            break;
        }
    }
    var xs = ["x1","x2","x3","x4"];
    var week = parseInt(forecast.epiweek.toString().substring(4,6));
    for (i = 0; i < xs.length; i++){
        var datapoint = data[xs[i]];
        var interval = determineInterval(datapoint.dist, ili_bin_size, datapoint.point);
        var date = getWeek((forecast.season.year).toString()+(week + i + 1).toString());
        lines.forecast.push([date, datapoint.point]);
        lines.confidenceInterval.push({
            "x" : getWeek((forecast.season.year).toString() + date),
            "lower" : interval[0], "upper" : interval[1]
        });
    }

    // Peakweek
    var peakweek = data.peakweek.point;
    var peakweekId = peakweekCast(peakweek, forecast.season.year);
    lines.peak = [peakweekId+39, data.peak.point];
    var peak_ili_interval = determineInterval(data.peak.dist, ili_bin_size, data.peak.point);
    var peakweek_interval = determineInterval(data.peakweek.dist, 1, peakweekId);
    lines.peak_time_interval = [[peakweek_interval[0]+39,data.peak.point], [peakweek_interval[1]+39, data.peak.point]];
    lines.peak_ili_interval = [[peakweekId+39, peak_ili_interval[0]], [peakweekId+39, peak_ili_interval[1]]];

    // Onset
    if (forecast.baselines != null){
        var onsetWeek = data.onset.point;
        var onsetWeekId = peakweekCast(onsetWeek, forecast.season.year);
        lines.onset = [onsetWeekId+39];
        var onsetweek_interval = determineInterval(data.onset.dist, 1, onsetWeekId);
        lines.onsetweek_interval = [[onsetweek_interval[0]+39,data.onset.point], [onsetweek_interval[1]+39, data.onset.point]];
    }

    visualizeData(lines);
}

// Visualization functions;
function determineCanvas(){
    // global variables
    canvas_width = Math.round(window.innerWidth * 0.66) - margin.left - margin.right;
    canvas_height = Math.min(
        Math.round(window.innerHeight * 0.73) - margin.top - margin.bottom,
        Math.round(canvas_width*0.75)
    );
    $('#chart').height(canvas_height + margin.top + margin.bottom);
    $('#chart').width(canvas_width + margin.left + margin.right);
}

function reloadChart(){
    plotChart = d3.select('#chart')
        .append('svg')
        .attr('id', 'main_chart')
        .attr('width', canvas_width + margin.left + margin.right)
        .attr('height', canvas_height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function createLegend(){
    var xLoc = canvas_width - 150;
    var final_ili_text;
    if(forecast.season.year == curr_season){
        final_ili_text = "Latest issue of wILI(at "+
            Math.floor(forecast.season.iliCoverage[1]/100)+"wk"
            +forecast.season.iliCoverage[1]%100+")";
    }
    else{
        var y = parseInt(forecast.season.year)+1;
        final_ili_text = "Finalized wILI(at "+y+"wk30)"
    }
    plotChart.append("svg:line")
        .attr("x1", xLoc-20)
        .attr("x2", xLoc-10)
        .attr("y1", 30)
        .attr("y2", 30)
        .attr("stroke", actual_line_color)
        .attr("stroke-width", "1.5");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 32.5)
        .text("wILI estimates at prediction time")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    plotChart.append("svg:line")
        .attr("x1", xLoc-20)
        .attr("x2", xLoc-10)
        .attr("y1", 50)
        .attr("y2", 50)
        .attr("stroke", latest_ili_color)
        .attr("stroke-width", "1.5");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 52.5)
        .text(final_ili_text)
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    plotChart.append("circle")
        .attr("cx", xLoc - 15)
        .attr("cy", 70)
        .attr("r", 4)
        .attr("fill", predict_circle_color)
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 72.5)
        .text("Predicted wILI")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc - 15)
        .attr("y", 94.5)
        .text("X")
        .attr("fill", predict_line_color)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 92.5)
        .text("Predicted peak")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    if(forecast.baselines!=null){
        plotChart.append("text")
            .attr("x", xLoc - 15)
            .attr("y", 114.5)
            .text("o")
            .attr("fill", onset_color)
            .attr("font-size", "14px")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("class", "perm");

        plotChart.append("text")
            .attr("x", xLoc)
            .attr("y", 112.5)
            .text("Predicted onset")
            .attr("fill", text_color)
            .attr("font-size", "10px")
            .attr("text-anchor", "start")
            .attr("class", "perm");
    }
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

    var season = forecast.season.year;
    var end = weeksInYear(season) + 29;

    var xScale = d3.scale.linear()
        .domain([30, end])
        .range([0, canvas_width]);

    var xScaleTime = d3.time.scale()
        .domain([
            moment(season.toString() + "30", "YYYYWW"),
            moment((season + 1).toString() + "29", "YYYYWW")
        ])
        .range([0, canvas_width]);

    var max_height;
    if (forecast.max_height[forecast.location]!=null){
        max_height = forecast.max_height[forecast.location];
    }
    else {
        max_height = lines.peak_ili_interval[1][1]*1.1;
    }
    var yScale = d3.scale.linear()
        .domain([0, max_height])
        .range([canvas_height, 0]);

    var xAxisWeek = d3.svg.axis()
        .scale(xScale)
        .ticks((end - 30) / 2)
        .tickFormat(function(x){return ((x - 1) % (weeksInYear(season))) + 1})
        .orient('bottom');

    var xAxisMonth = d3.svg.axis()
        .scale(xScaleTime)
        .tickSize(5, 0)
        .ticks(d3.time.months)
        .tickFormat(d3.time.format("%b"))
        .orient('bottom');

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left');

    var confidenceArea = d3.svg.area()
        .interpolate("linear")
        .x(function(d) { return xScale(d.x); })
        .y0(function(d) {
                return yScale(d.lower); })
        .y1(function(d) {
                return yScale(d.upper); });
    plotChart.append('g')
        .attr('class', 'x-axis')
        .attr('fill',text_color)
        .attr('transform', 'translate(0,' + canvas_height + ')')
        .call(xAxisWeek)
        .append("text")
            .attr("class", "label")
            .attr("x", canvas_width)
            .attr("y", -6)
            .attr('fill',text_color)
            .style("text-anchor", "end")
            .text("Epi Week");

    var axisShift = Math.round(canvas_height * 0.05);
    var monthShift = Math.round(canvas_width * 0.04);

    plotChart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', 'translate(0,' + (canvas_height + axisShift) + ')')
        .attr('fill',text_color)
        .call(xAxisMonth)
            .selectAll("text")
            .attr("transform", "translate(" + monthShift + ", 0)" )
            .last().remove();

    plotChart.append('g')
        .attr('class', 'y-axis')
        .attr('fill',text_color)
        .call(yAxis)
        .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 7)
            .attr("x", -3)
            .attr("dy", ".72em")
            .style("text-anchor", "end")
            .attr('fill',text_color)
            .text("% Weighted ILI");

    var pastXValue = xScale(lines.forecast[0][0]);
    var widthValue = canvas_width - Math.abs(pastXValue - canvas_width);

    var pastRect = plotChart.append('g');

    pastRect.append("rect")
        .attr("width", widthValue)
        .attr("height", canvas_height)
        .attr("fill", "white")
        .attr("opacity", "0.1");

    pastRect.append("text")
        .attr("class", "label")
        .attr("y", 5)
        .attr("x", widthValue - 5)
        .attr("dy", ".72em")
        .style("text-anchor", "end")
        .text("< Past")
        .attr("fill", "white");

    pastRect.append("text")
        .attr("class", "label")
        .attr("y", 5)
        .attr("x", widthValue + 5)
        .attr("dy", ".72em")
        .style("text-anchor", "start")
        .text("Future >")
        .attr("fill", "white");

    var line = d3.svg.line()
        .x(function(d) {return xScale(d[0]);})
        .y(function(d) {return yScale(d[1]);})
        .interpolate("linear");

    // latest ili
    if(lines.latestIli != null){
        plotChart.append("path")
            .datum(lines.latestIli)
            .attr("class", "line")
            .attr("d", line)
            .attr("stroke", latest_ili_color);
    }

    // current ili
    plotChart.append("path")
        .datum(lines.currIli)
        .attr("class", "line")
        .attr("d", line)
        .attr("stroke", actual_line_color);

    // baseline
    if (forecast.baselines != null){
        plotChart.append("svg:line")
            .attr("x1", 0)
            .attr("x2", canvas_width)
            .attr("y1", yScale(forecast.baselines[forecast.location]))
            .attr("y2", yScale(forecast.baselines[forecast.location]))
            .style("stroke", "#eee")
            .style("stroke-opacity", 0.9)
            .style("stroke-dasharray", ("3, 3"));
    }

    if (forecast.showConfidenceIntervals){
        // Prediction interval
        plotChart.append("path")
             .datum(lines.confidenceInterval)
             .attr("class", "confidence")
             .attr("d", confidenceArea)
             .attr("stroke", "")
             .attr("fill", conf_area_color)
             .attr("opacity", "0.1");

        // Peak interval
        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]))
             .attr("x2", xScale(lines.peak_ili_interval[1][0]))
             .attr("y1", yScale(lines.peak_ili_interval[0][1]))
             .attr("y2", yScale(lines.peak_ili_interval[1][1]))
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5")
             .style("stroke-dasharray", ("3, 3"));

        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[0][0]))
             .attr("x2", xScale(lines.peak_time_interval[1][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]))
             .attr("y2", yScale(lines.peak_time_interval[1][1]))
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5")
             .style("stroke-dasharray", ("3, 3"));

        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]) - 5)
             .attr("x2", xScale(lines.peak_ili_interval[1][0]) + 5)
             .attr("y1", yScale(lines.peak_ili_interval[0][1]))
             .attr("y2", yScale(lines.peak_ili_interval[0][1]))
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5");

        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_ili_interval[0][0]) - 5)
             .attr("x2", xScale(lines.peak_ili_interval[1][0]) + 5)
             .attr("y1", yScale(lines.peak_ili_interval[1][1]))
             .attr("y2", yScale(lines.peak_ili_interval[1][1]))
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5");

        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[0][0]))
             .attr("x2", xScale(lines.peak_time_interval[0][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]) - 5)
             .attr("y2", yScale(lines.peak_time_interval[1][1]) + 5)
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5");

        plotChart.append("svg:line")
             .attr("x1", xScale(lines.peak_time_interval[1][0]))
             .attr("x2", xScale(lines.peak_time_interval[1][0]))
             .attr("y1", yScale(lines.peak_time_interval[0][1]) - 5)
             .attr("y2", yScale(lines.peak_time_interval[1][1]) + 5)
             .attr("stroke", predict_line_color)
             .attr("stroke-width", "1.5");

        // onset interval
        if (forecast.baselines != null){
            plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[0][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[1][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.location]))
                 .attr("y2", yScale(forecast.baselines[forecast.location]))
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");

            plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[0][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[0][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.location]) - 5)
                 .attr("y2", yScale(forecast.baselines[forecast.location]) + 5)
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");

            plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[1][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[1][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.location]) - 5)
                 .attr("y2", yScale(forecast.baselines[forecast.location]) + 5)
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");
        }
    }

    plotChart.append("path")
             .datum(lines.forecast)
             .attr("class", "line")
             .attr("d", line)
             .attr("stroke", predict_line_color);

    plotChart.append("text")
             .attr("x", xScale(lines.peak[0]))
             .attr("y", yScale(lines.peak[1]) + 4.5)
             .text("X")
             .attr("fill", predict_line_color)
             .attr("font-size", "18px")
             .attr("text-anchor", "middle")
             .attr("font-weight", "bold")

    // onset
    if (forecast.baselines != null){
        plotChart.append("text")
            .attr("x", xScale(lines.onset[0]))
            .attr("y", yScale(forecast.baselines[forecast.location])+4.5)
            .text("o")
            .attr("fill", onset_color)
            .attr("font-size", "18px")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold");
    }

    var circleData = [];
    var temp;

    for (var i = 0; i < lines.forecast.length; i++){
        temp = lines.forecast[i];
        temp.push(predict_circle_color);
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
};

d3.selection.prototype.first = function() {
    return d3.select(this[0][0]);
};
d3.selection.prototype.last = function() {
    var last = this.size() - 1;
    return d3.select(this[0][last]);
};

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
};

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
};

function weekButtonControl(){
    $("body").keydown(function(e) {
        e.preventDefault();
        if(e.keyCode == 37) {
            changeWeek(-1);
        }
        else if(e.keyCode == 39) {
            changeWeek(1);
        }
    });
}

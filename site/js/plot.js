forecast = {};
sysObj = function(id,startWeek,endWeek){
    this.id = id;
    this.startWeek = startWeek;
    this.endWeek = endWeek;
}

sys_meta = {
    y14:{
        year:2014,
        sys:[new sysObj('eb',201441,201519), new sysObj('ec',201441,201519), new sysObj('sp',201441,201519)],
        lastWeekInYear: 201453,
        iliCoverage:[201439,201521]
    },
    y15:{
        year:2015,
        sys:[new sysObj('st',201542,201619), new sysObj('af',201541,201619), new sysObj('ec',201541,201619)],
        lastWeekInYear: 201552,
        iliCoverage:[201539,201621]
        
    },
    y16:{
        year:2016,
        sys:[new sysObj('st',201643,null), new sysObj('ec',201643,null)],
        lastWeekInYear: 201652,
        iliCoverage:[201641,null]
    }
};

function setCurrentSeason(data){
    for (var i in data) {
        if(data[i].system=='st')
        {
            sys_meta.y16.sys[0].endWeek = data[i].last_week;
        }
        else if(data[i].system=='ec')
        {
            sys_meta.y16.sys[1].endWeek = data[i].last_week;
        }
    }
}
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

// Define global params here
Season = function(yr,num_weeks,sys_list){
    this.year = yr;
    this.num_weeks = num_weeks;
    this.systems = sys_list;
};
 
function initalization(){
    // initialize doc size
    determine_dim();

    // init vis parameters
    forecast.season = sys_meta.y16;
    forecast.sys = forecast.season.sys[0];
    forecast.epiweek = forecast.sys.startWeek;
    forecast.region = 'nat';
    forecast.showConfidenceIntervals = true;

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

function changeSeason(season){
    var curr_sys = forecast.sys.id;
    if (season == 2014){
        forecast.season = sys_meta.y14;
        $("#system_dropdown_2015").hide();
        $("#system_dropdown_2016").hide();
        $("#system_dropdown_2014").show();
    }
    if (season == 2015){
        forecast.season = sys_meta.y15;
        $("#system_dropdown_2014").hide();
        $("#system_dropdown_2016").hide();
        $("#system_dropdown_2015").show()
    }
    else if(season == 2016){
        forecast.season = sys_meta.y16;
        $("#system_dropdown_2014").hide();
        $("#system_dropdown_2015").hide();
        $("#system_dropdown_2016").show();
    }
    forecast.epiweek = season*100+41;
    // Set system
    changeSystem(curr_sys);
    // change the dropdown
    var dropdown_id = '#system_dropdown_'+forecast.season.year;
    $(dropdown_id).val(forecast.sys.id).change();
    loadData();
}

function changeSystem(system){
    // Set to default first
    forecast.sys = forecast.season.sys[0];
    
    for(var i in forecast.season.sys){
        if(forecast.season.sys[i].id==system)
        {
            forecast.sys = forecast.season.sys[i];
            break;
        }
    }
    // Check whether epiweek is in range
    if(forecast.epiweek<forecast.sys.startWeek)
        forecast.epiweek=forecast.sys.startWeek;
    else if(forecast.epiweek>forecast.sys.endWeek)
        forecast.epiweek=forecast.sys.endWeek;
        
    loadData();
}

function changeRegion(value){
    forecast.region = value;
    loadData();
}

function getChartTitle(){
    if (forecast.region == "nat")
        region = "National";
    else
        region = "Region " + forecast.region.replace("hhs", "");
    year = forecast.season.year.toString() + "-" + (parseInt(forecast.season.year) + 1).toString();
    return (region + " Influenza Forecast, " + year)
}

function getSubChartTitle(){
    return "Prediction Week: "+(Math.floor(forecast.epiweek/100))+"wk"+(forecast.epiweek%100);
}

function loadData(){
    $("#chart_title").text(getChartTitle());
    $("#chart_subtitle").text(getSubChartTitle());
    var forecast_data, curr_ili, latest_ili;
    Epidata.delphi(function(result, info, data) {
        if (!result) {
            // If loading fails, `data` is a string with the reason
            alert('ForecastLoader says: ' + data);
            return;
        }
        else{
            forecast_data = data;
            var start = forecast.season.iliCoverage[0];
            var end = forecast.season.iliCoverage[1];

            Epidata.fluview(function(result, info, curr_issue){
                if (!result){
                    alert('ForecastLoader says: ' + data);
                }
                else{
                    curr_ili = curr_issue;
                    Epidata.fluview(function(result, info, latest_issue){
                        if (!result){
                            alert('ForecastLoader says: ' + data);
                        }
                        // Add latest ili
                        else{
                            latest_ili = latest_issue;
                            processData(forecast_data, curr_ili, latest_ili);
                        }
                    }, forecast.region, Epidata.range(start, end),
                            issues = end);
                }
            }, forecast.region, Epidata.range(start, end),
                    issues = forecast.epiweek);
        }
    }, forecast.sys.id, forecast.epiweek);
    
}

// Data parsing functions; will be kept intact --Lisheng
function determineYear(week, season){
    if (week < 21){
        return moment(season, "YYYY").add(1, 'years').year();
    }
    else{
        return season;
    }
}

function weeksInYear(y) {
    y = y.toString();
    if (y == "2014")
        return 53;
    else
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
        week += parseInt(weeksInYear(forecast.season.year));
    }
    return week;
}

function processData(forecast_ili, curr_ili, latest_ili){
    var data = forecast_ili[0].forecast.data[forecast.region];
    var ili_bin_size = forecast_ili[0].forecast.ili_bin_size;
    var ili_bins = forecast_ili[0].forecast.ili_bins;
    var lines = {};
    forecast.baselines = forecast_ili[0].forecast.baselines;
    forecast.num_weeks = forecast_ili[0].forecast.season.year_weeks;
    lines.currIli = [];
    for (var i = 0; i < curr_ili.length; i++){
            var week = getWeek(curr_ili[i].epiweek);
            lines.currIli.push([week, curr_ili[i].wili]);
    }
    
    lines.latestIli = [];
    for (var i = 0; i < latest_ili.length; i++){
            var week = getWeek(latest_ili[i].epiweek);
            lines.latestIli.push([week, latest_ili[i].wili]);
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
        var date = getWeek(forecast.season.year + (week + i + 1).toString());
        lines.forecast.push([date, datapoint.point]);
        forecast.season.year = forecast.season.year.toString();
        lines.confidenceInterval.push({"x" : getWeek(forecast.season.year + date), "lower" : interval[0], "upper" : interval[1]});
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
    var onsetWeek = data.onset.point;
    var onsetWeekId = peakweekCast(onsetWeek, forecast.season.year);
    lines.onset = [onsetWeekId+39];
    var onsetweek_interval = determineInterval(data.onset.dist, 1, onsetWeekId);
    lines.onsetweek_interval = [[onsetweek_interval[0]+39,data.onset.point], [onsetweek_interval[1]+39, data.onset.point]];

    visualizeData(lines);
}

// Visualization functions; will be kept intact --Lisheng
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

function reloadChart(){
    plotChart = d3.select('#chart')
        .append('svg')
        .attr('id', 'main_chart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

function createLegend(){
    var xLoc = width - 150;
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
        .text("WILI estimates at prediction time")
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
        .text("Latest wILI")
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
        .text("Predicted Peak")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");
        
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
        .text("Predicted Onset")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");
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

    var season = parseInt(forecast.season.year);
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
             .attr('fill',text_color)
             .attr('transform', 'translate(0,' + height + ')')
             .call(xAxisWeek)
             .append("text")
                 .attr("class", "label")
                 .attr("x", width)
                 .attr("y", -6)
                 .attr('fill',text_color)
                 .style("text-anchor", "end")
                 .text("Epi Week");
    
    var axisShift = Math.round(height * 0.05);
    var monthShift = Math.round(width * 0.04);

    plotChart.append('g')
             .attr('class', 'x-axis')
             .attr('transform', 'translate(0,' + (height + axisShift) + ')')
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
     var widthValue = width - Math.abs(pastXValue - width);

     var pastRect = plotChart.append('g');

     pastRect.append("rect")
             .attr("width", widthValue)
             .attr("height", height)
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
                 .x(function(d) {
                     return xScale(d[0]);
                    })
                 .y(function(d) {
                     return yScale(d[1]);
                    })
                 .interpolate("linear");
    
    plotChart.append("path")
             .datum(lines.latestIli)
             .attr("class", "line")
             .attr("d", line)
             .attr("stroke", latest_ili_color);
             
    plotChart.append("path")
             .datum(lines.currIli)
             .attr("class", "line")
             .attr("d", line)
             .attr("stroke", actual_line_color);
    
    
    // baseline
    plotChart.append("svg:line")
             .attr("x1", 0)
             .attr("x2", width)
             .attr("y1", yScale(forecast.baselines[forecast.region]))
             .attr("y2", yScale(forecast.baselines[forecast.region]))
             .style("stroke", "#eee")
             .style("stroke-opacity", 0.9)
             .style("stroke-dasharray", ("3, 3"));
             
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
        plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[0][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[1][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.region]))
                 .attr("y2", yScale(forecast.baselines[forecast.region]))
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");
                 
        plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[0][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[0][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.region]) - 5)
                 .attr("y2", yScale(forecast.baselines[forecast.region]) + 5)
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");

        plotChart.append("svg:line")
                 .attr("x1", xScale(lines.onsetweek_interval[1][0]))
                 .attr("x2", xScale(lines.onsetweek_interval[1][0]))
                 .attr("y1", yScale(forecast.baselines[forecast.region]) - 5)
                 .attr("y2", yScale(forecast.baselines[forecast.region]) + 5)
                 .attr("stroke", onset_color)
                 .attr("stroke-width", "1.5");

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
    plotChart.append("text")
             .attr("x", xScale(lines.onset[0]))
             .attr("y", yScale(forecast.baselines[forecast.region])+4.5)
             .text("o")
             .attr("fill", onset_color)
             .attr("font-size", "18px")
             .attr("text-anchor", "middle")
             .attr("font-weight", "bold");

    var circleData = [];
    var temp;
    //Hack to fix circle issue
    /*
    if (lines.currIli.length > 2){
        for (i = 0; i < 2; i++){
            temp = lines.currIli[i];
            temp.push(actual_circle_color);
            circleData.push(temp);
        }
    }
    for (i = 0; i < lines.currIli.length; i++){
        temp = lines.currIli[i];
        temp.push(actual_circle_color);
        circleData.push(temp);
    }
    */
    for (i = 1; i < lines.forecast.length; i++){
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

}

// Read in meta data
$(document).ready(function(){
    Epidata.meta(function(a, b, data){
        sys_meta.y16.iliCoverage[1] = data[0].fluview[0].latest_issue;
        data = data[0].delphi;
        setCurrentSeason(data);
        initalization();
        //script_on_page();
        reloadChart();
        weekButtonControl();
        loadData();
    });
});

// Not sure what is this funcion --Lisheng
function script_on_page(){
    $(".dropdown-menu li a").click(function(){
        $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
        $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
    });
    
    $('[data-toggle="tooltip"]').tooltip(); 
}

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

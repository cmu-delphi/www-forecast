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
actual_line_color = "#68C8F7";
actual_circle_color = "#1499DB";
text_color = "#ccc";
conf_area_color = "#FCFF9C";

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
    Epidata.delphi(function(result, info, data) {
        if (!result) {
            // If loading fails, `data` is a string with the reason
            alert('ForecastLoader says: ' + data);
            return;
        }
        else{
            //
            var start = forecast.season.iliCoverage[0];
            var end = forecast.season.iliCoverage[1];

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
    var lowerArea = 0;
    var lowerBound;
    var thres = 0.05;
    for(var i=0;i<data.length;i++){
        lowerArea += data[i];
        if(lowerArea>=thres)
        {
            //Interpolation to find exact position
            var prevA = lowerArea - data[i];
            lowerBound = i-1+(thres-prevA)/data[i];
            lowerBound = Math.max(lowerBound,0);
            break;
        }
    }
    
    var upperArea = 0;
    var upperBound;
    for(var i=data.length-1;i>=0;i--){
        upperArea += data[i];
        if(upperArea>=thres)
        {
            //Interpolation to find exact position
            var prevA = upperArea - data[i];
            upperBound = i+1-(thres-prevA)/data[i];
            upperBound = Math.min(upperBound,data.length-1);
            break;
        }
    }
    
    //Dealing with highest bin being infinity
    /*
    if (upperBound == data.length - 1){
        var infinity_bin_size = 2.5;
        upperBound += (upperBound % 1) * infinity_bin_size
    }
    */
    var result = [(lowerBound * bin_size), (upperBound * bin_size)];
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
        week += parseInt(weeksInYear(forecast.season.year));
    }
    return week;
}

function processData(full_data, trendline){
    var data = full_data[0].forecast.data[forecast.region];
    var ili_bin_size = full_data[0].forecast.ili_bin_size;
    var ili_bins = full_data[0].forecast.ili_bins;
    var lines = {};
    forecast.baselines = full_data[0].forecast.baselines;
    forecast.num_weeks = full_data[0].forecast.season.year_weeks;
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
        var interval = determineInterval(datapoint.dist, ili_bin_size, datapoint.point);
        var date = getWeek(forecast.season.year + (week + i + 1).toString());
        lines.forecast.push([date, datapoint.point]);
        forecast.season.year = forecast.season.year.toString();
        lines.confidenceInterval.push({"x" : getWeek(forecast.season.year + date), "lower" : interval[0], "upper" : interval[1]});
    }
    var peakweek = data.peakweek.point;
    var peakweek_year = determineYear(parseInt(data.peakweek.point), parseInt(forecast.season.year));
    var peakweek = getWeek(peakweek_year.toString() + peakweek.toString());
    lines.peak = [peakweek, data.peak.point];
    var peakweek_point;
    if (data.peak.point < 21)
        peakweek_point = (weeksInYear(forecast.season.year) - 40) + data.peak.point;
    else
        peakweek_point = data.peak.point - 40;
    var ili_interval = determineInterval(data.peak.dist, ili_bin_size, data.peak.point);
    var week_interval = determineInterval(data.peakweek.dist, 1, peakweek_point);
    week_interval[0] = (39 + week_interval[0]);
    week_interval[1] = (39 + week_interval[1]);
    lines.peak_time_interval = [[week_interval[0],data.peak.point], [week_interval[1], data.peak.point]];
    lines.peak_ili_interval = [[peakweek, ili_interval[0]], [peakweek, ili_interval[1]]];
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
    var xLoc = width - 100;

    plotChart.append("circle")
        .attr("cx", xLoc - 15)
        .attr("cy", 20)
        .attr("r", 4)
        .attr("fill", actual_circle_color)
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 22.5)
        .text("Actual")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    plotChart.append("circle")
        .attr("cx", xLoc - 15)
        .attr("cy", 50)
        .attr("r", 4)
        .attr("fill", predict_circle_color)
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 52.5)
        .text("Predicted")
        .attr("fill", text_color)
        .attr("font-size", "10px")
        .attr("text-anchor", "start")
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc - 15)
        .attr("y", 85)
        .text("X")
        .attr("fill", predict_circle_color)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("class", "perm");

    plotChart.append("text")
        .attr("x", xLoc)
        .attr("y", 82)
        .text("Predicted Peak")
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
             .attr("opacity", "0.2");

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

    if (forecast.showConfidenceIntervals){
        plotChart.append("path")
                 .datum(lines.confidenceInterval)
                 .attr("class", "confidence")
                 .attr("d", confidenceArea)
                 .attr("stroke", "")
                 .attr("fill", conf_area_color)
                 .attr("opacity", "0.25");
        
        // Peak interval
        plotChart.append("svg:line")
                 .attr("x1", xScale(lines.peak_ili_interval[0][0]))
                 .attr("x2", xScale(lines.peak_ili_interval[1][0]))
                 .attr("y1", yScale(lines.peak_ili_interval[0][1]))
                 .attr("y2", yScale(lines.peak_ili_interval[1][1]))
                 .attr("stroke", predict_line_color)
                 .attr("stroke-width", "1.5");
        
        plotChart.append("svg:line")
                 .attr("x1", xScale(lines.peak_time_interval[0][0]))
                 .attr("x2", xScale(lines.peak_time_interval[1][0]))
                 .attr("y1", yScale(lines.peak_time_interval[0][1]))
                 .attr("y2", yScale(lines.peak_time_interval[1][1]))
                 .attr("stroke", predict_line_color)
                 .attr("stroke-width", "1.5");
                         
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

    }

    plotChart.append("path")
             .datum(lines.trendline)
             .attr("class", "line")
             .attr("d", line)
             .attr("stroke", actual_line_color);

    plotChart.append("path")
             .datum(lines.forecast)
             .attr("class", "line")
             .attr("d", line)
             .attr("stroke", predict_line_color);
    
    plotChart.append("text")
             .attr("x", xScale(lines.peak[0]))
             .attr("y", yScale(lines.peak[1]) + 6.5)
             .text("X")
             .attr("fill", predict_line_color)
             .attr("font-size", "20px")
             .attr("text-anchor", "middle")
             .attr("font-weight", "bold");

    plotChart.append("svg:line")
             .attr("x1", 0)
             .attr("x2", width)
             .attr("y1", yScale(forecast.baselines[forecast.region]))
             .attr("y2", yScale(forecast.baselines[forecast.region]))
             .style("stroke", "#eee")
             .style("stroke-opacity", 0.9)
             .style("stroke-dasharray", ("3, 3"));

    var circleData = [];
    var temp;
    //Hack to fix circle issue
    if (lines.trendline.length > 2){
        for (i = 0; i < 2; i++){
            temp = lines.trendline[i];
            temp.push(actual_circle_color);
            circleData.push(temp);
        }
    }
    for (i = 0; i < lines.trendline.length; i++){
        temp = lines.trendline[i];
        temp.push(actual_circle_color);
        circleData.push(temp);
    }
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
/*
$(document).on('keydown', 'select', function(event) {
        event.preventDefault();
        var value = $(this).find('option:selected').val();
        if ((event.which == 37 || event.which === 39)) {
                setTimeout(function (obj, val) {
                                return function() {
                                        obj.find('option[value="' + val + '"]').prop("selected", true)
                                }
                }($(this), value), 0);
        }
});
*/

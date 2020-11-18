(function(){
    //making these global in order for all functions to be able to reach them
    var attrArray =["BachelorsRate", "MedIncome", "DemocratRate", "RepublicanRate", "CovidCasesPer1k"]
    var expressed = attrArray[0]
    var chartWidth = window.innerWidth * .45
    var chartHeight = 500
    
    var yScale = d3.scale.linear()
        .range([0, chartHeight])
        .domain([0, 105]);
    //this starts the process
    window.onload = setMap();

    function setMap(){
        //creates the map svg
        var width = window.innerWidth * 0.45
        var height = 500
//change  svg append here
        var map = d3.select("#map")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        var projection = d3.geo.albers()
            .center([0, 46.2])
            .rotate([120, 0])
            .parallels([43, 60])
            .scale(3750)
            .translate([width / 2, height / 2]);

        var path = d3.geo.path()
            .projection(projection)
        //loads in the data from the data folder
        d3.queue()
            .defer(d3.csv, "data/D3LabDataEDITED.csv")
            .defer(d3.json, "data/PNWstates.topojson")
            .defer(d3.json, "data/WA_Counties_new.topojson")
            .await(callback);
        function callback(error, csv, states, washington){
            if (error) throw error;
            //graticule creation
            var graticule = d3.geo.graticule()
                .step([1,1]);
            
            var gratlines = map.selectAll(".gratLines")
                .data(graticule.lines)
                .enter()
                .append("path")
                .attr("class", "gratLines")
                .attr("d", path)
            
            var USstates = topojson.feature(states, states.objects.collection)
            var WAcounties = topojson.feature(washington,washington.objects.collection).features

            joinData(WAcounties,csv)
            
            //basemap states
            var states = map.append("path")
                .datum(USstates)
                .attr("class", "states")
                .attr("d", path);
            
            var colorScale = makeColorScale(csv)
            
            //data for chloropleth creation
            var counties = map.selectAll(".regions")
                .data(WAcounties)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "counties " + d.properties.CountyCode;
                })
                .attr("d", path)
                .style("fill", function(d){
                    //return colorScale(d.properties[expressed])
                    return chloropleth(d.properties, colorScale)
                })
                .on("mouseover", function(d){
                    highlight(d.properties)
                })
                .on("mouseout", function(d){
                    dehighlight(d.properties)
                })
                .on("mousemove", moveLabel)
            createDropdown(csv)
            //createFilter()
            
            setChart(csv,colorScale)
            }
        
    }
    function makeColorScale(data){
        var colorClasses = [
            "#b2e2e2",
            "#66c2a4",
            "#2ca25f",
            "006d2c", 
        ]
        var colorScale = d3.scale.quantile()
            .range(colorClasses);
        
        var domainArray = [];
        
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed])
            domainArray.push(val)
        }
        
        colorScale.domain(domainArray)
        
        return colorScale;
    }
    
    function joinData(counties, csv){
        for (var i=0; i<csv.length; i++){
                var csvregion = csv[i]
                var csvKey = csvregion.CountyCode;
                for (var a=0; a<counties.length; a++){
                    var geojsonProps = counties[a].properties;

                    var geojsonKey = geojsonProps.CountyCode

                    if (geojsonKey == csvKey){
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvregion[attr])
                            geojsonProps[attr] = val
                        })
                    }
                }
            }
    }
    
    function chloropleth(props, colorScale){
        var val = parseFloat(props[expressed]);
        if (!isNaN(val)){
            return colorScale(val)
        } else {
            return "#CCC"
        }
    }
    
    function setChart(csvData, colorScale){
        //change here
        var chart = d3.select("#chart")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
        
        
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.CountyCode
            })
            .attr("width", chartWidth / csvData.length - 1)
            //event listeners for dynamic visualization
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel)

        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .attr("class", "numbers")
            .sort(function (a, b){
              return b[expressed]-a[expressed]  
            })
            .attr("text-anchor", "middle")
        
        updateChart(bars, csvData.length, colorScale, numbers)
        
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed)

    }
    function createDropdown(csvData){
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            })
        
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute")
        
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){
                return d
            })
            .text(function(d){
                return d
            })
    }
    
//    function createFilter(){
//        var filterOption = d3.select("body")
//            .enter()
//            .append("button")
//            .type("type","button")
//            .attr("class", "filter")
//            .text("filter")
//            .on("click", function(){
//                filterCounties()
//            })
//        var titleOption = filter.append("option")
//            .attr("class", "titleOption")
//            .attr("disabled", "true")
//            .text("Select Attribute")
//    }
    
    function changeAttribute(attribute, csvData){
        expressed = attribute;
        var colorscale = makeColorScale(csvData)
            
        var counties = d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return chloropleth(d.properties, colorscale)
            })
        var bars = d3.selectAll(".bars")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .style("fill", function(d){
                return chloropleth(d, colorscale)
            })
            .transition()
            .duration(1000)
        var numbers = d3.selectAll(".numbers")
            .sort(function (a, b){
              return b[expressed]-a[expressed]  
            })
            .transition()
            .duration(1000)
            updateChart(bars, csvData.length, colorscale, numbers)
    }
    
    function updateChart(bars, n, colorScale, numbers){
        bars.attr("x", function(d, i){
                return i * (chartWidth / n)
            })
            .attr("height", function(d){
                return yScale(parseFloat(d[expressed]))
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]))
            })
            .style("fill", function(d){
                return chloropleth(d, colorScale)
            });
        numbers.attr("x", function(d, i){
            var fraction = chartWidth / n
            return i * fraction + (fraction -1) / 2
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 10
            })
            if (expressed == "MedIncome"){
                numbers.text(function(d){
                    return d[expressed] + "k"
                })
            }
            else {
                numbers.text(function(d){
                    return d[expressed]
                })
            }
        var chartTitle = d3.select(".chartTitle")
            .text(expressed)
        
    }
    
    function filterData(){
        console.log("test")
    }
    
    function highlight(props){
        var selected = d3.selectAll("." + props.CountyCode)
            .style("stroke", "blue")
            .style("stroke-width", "2")
        setLabel(props)
    }
    function dehighlight(props){
        d3.select(".infolabel")
            .remove();
        var selected = d3.selectAll(".counties." + props.CountyCode)
            .style("stroke", "black")
            .style("stroke-width", "1")
        var selected2 = d3.selectAll(".bars." + props.CountyCode)
            .style("stroke-width", "0")
            
    }
    function setLabel(props){
        if (expressed == "MedIncome"){
            var labelAttribute = "<h1>" + props[expressed] + "k" + "</h1><b>" + expressed + "</b>"
        }
        else{
            var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>"
        }
        
        
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.CountyCode + " _label")
            .html(labelAttribute)
        
        var countyName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.CountyCode);
    }
    
    function moveLabel(){
        
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        
        var x1 = d3.event.clientX + 10
        var y1 = d3.event.clientY - 75
        var x2 = d3.event.clientX - labelWidth - 10
        var y2 = d3.event.clientY + 25
        
        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 
        
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px")
        
    }
    
})() 
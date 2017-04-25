$(function() {
    // Graph margin settings
    var margin = {
        top: 10,
        right: 10,
        bottom: 150,
        left: 60
    };

    // SVG width and height
    var width = 960;
    var height = 600;

    // Graph width and height - accounting for margins
    var drawWidth = width - margin.left - margin.right;
    var drawHeight = height - margin.top - margin.bottom;

    /************************************** Create chart wrappers ***************************************/
        // Create a variable `svg` in which you store a selection of the element with id `viz`
        // Set the width and height to your `width` and `height` variables
    var svg = d3.select('#viz')
            .attr('width', width)
            .attr('height', height);

    // Append a `g` element to your svg in which you'll draw your bars. Store the element in a variable called `g`, and
    // Transform the g using `margin.left` and `margin.top`
    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.right + ')')
        .attr('height', height)
        .attr('width', width);

    // Load data in using d3's csv function.

    var roundCheck =
    {
        'R128': false,
        'R64': false,
        'R32': true,
        'R16': true,
        'QF': true,
        'SF': true,
        'F': true
    };

    d3.csv('data/atp_matches_2016.csv', function(error, data) {

        var courtTypes = {};

        data = data.filter(function(d)
        {
            return d.tourney_level == 'M' || d.tourney_level == 'G';
        });

        //     .sort(function(a,b)
        // {
        //     if (a.tourney_name < b.tourney_name) return -1;
        //     if (a.tourney_name > b.tourney_name) return 1;
        //     return 0;
        // });

        data.forEach(function(d)
        {
            if (d.tourney_name == 'Roland Garros' || d.tourney_name == 'Us Open' || d.tourney_name == 'Wimbledon' || d.tourney_name == 'Australian Open')
            {
                d.tourney_name = d.tourney_name + ' (GS)';
            }
            if (!courtTypes[d.tourney_name])
            {
                courtTypes[d.tourney_name] = d.surface;
            }
        });

        console.log(data);
        /************************************** Data prep ***************************************/

        // You'll need to *aggregate* the data such that, for each device-app combo, you have the *count* of the number of occurances
        // Lots of ways to do it, but here's a slick d3 approach:
        // http://www.d3noob.org/2014/02/grouping-and-summing-data-using-d3nest.html
        var countData,
            tournaments;
        function setData(courtType, resultType)
        {
            var mastersData = d3.nest().key(function (d)
            {
                return d.tourney_name;
            });

            countData = mastersData.rollup(function (v)
            {
                return d3.sum(v, function(d)
                {
                    var value = parseInt(d.w_ace) + parseInt(d.l_ace);
                    if (courtType)
                    {
                        if (courtType != d.surface)
                        {
                            return 0;
                        }
                    }

                    if (resultType)
                    {
                        if (resultType == 'winner')
                        {
                            value -= d.l_ace;
                        }
                        else
                        {
                            value -= d.w_ace;
                        }
                    }


                    if (!roundCheck[d.round])
                    {
                        return 0;
                    }


                    return value;
                })
            }).entries(data);

            return countData.sort(function(a,b)
            {
                if (a.value < b.value) return -1;
                if (a.value > b.value) return 1;
                return 0;
            });
        }

        // Create an `xAxisLabel` by appending a `g` element to your `svg` variable and give it a class called 'axis'.
        // Transform the `g` element so that it will be properly positioned (need to shift x and y position)
        // Finally, use the `.call` method to render your `xAxis` in your `xAxisLabel`

        var xAxisLabel = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + margin.left + ',' + (margin.top + drawHeight) + ')');

        // Create a text element to label your x-axis by appending a text element to your `svg`
        // You'll need to use the `transform` property to position it below the chart
        // Set its class to 'axis-label', and set the text to "Device-App Combinations"

        var xAxisText = svg.append('text')
            .text('ATP Masters and Grand Slam Tournaments')
            .attr('x', (drawWidth / 2) - margin.left)
            .attr('y', height - 20);

        // Using the same pattern as your x-axis, append another g element and create a y-axis for your graph

        var yAxisLabel = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        // Using the same pattern as your x-axis, append a text element to label your y axis
        // Set its class to 'axis-label', and set the text to "Count"

        var yAxisText = svg.append('text')
            .text('Number of Aces')
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (drawHeight / 2))
            .attr("dy", "5em")
            .style("text-anchor", "middle");

        /************************************** Defining scales and axes ***************************************/

        var xScale,
            yScale,
            xAxis,
            yAxis;

        function setScales(countData)
        {
            // Create an `xScale` for positioning the bars horizontally. Given the data type, `d3.scaleBand` is a good approach.
            tournaments = countData.map(function (d)
            {
                return d.key;
            });

            xScale = d3.scaleBand()
                .domain(tournaments)
                .range([0, drawWidth])
                .padding(0.1);

            // Create a variable that stores the maximum count using `d3.max`, and multiply this valu by 1.1
            // to create some breathing room in the top of the graph.

            var maxCount = d3.max(countData, function (d)
                {
                    return +d.value;
                }) * 1.1;

            // Create a `yScale` for drawing the heights of the bars. Given the data type, `d3.scaleLinear` is a good approach.

            yScale = d3.scaleLinear()
                .domain([0, maxCount])
                .range([drawHeight, 0]);
        }

        function setAxes()
        {
            xAxis = d3.axisBottom()
                .scale(xScale);

            yAxis = d3.axisLeft()
                .scale(yScale);

            xAxisLabel.transition().call(xAxis);

            yAxisLabel.transition().call(yAxis);

            // Rotate labels on x axis 45 degrees
            xAxisLabel.selectAll('text')
                .attr('transform', 'rotate(-45)')
                .attr('text-anchor', 'end');
        }

        var courtColors =
        {
            'Grass': '#42f445',
            'Clay': '#f48342',
            'Hard': '#427df4'
        };

        /************************************** Drawing Data ***************************************/
        function draw(countData)
        {
            setScales(countData);

            setAxes();

            // Select all elements with the class 'bar' in your `g` element. Then, conduct a data-join
            // with your parsedData array to append 'rect' elements with `he class set as 'bar'
            var bars = g.selectAll('.bar')
                .data(countData);


            // Determine which elements are new to the screen (`enter`), and for each element,
            // Append a `rect` element, setting the `x`, `y`, `width`, and `height` attributes using your data and scales
            bars.enter()
                .append('rect')
                .attr('height', 0)
                .attr('y', drawHeight)
                .attr('x', function (d)
                {
                    return xScale(d.key);
                })
                .attr('width', xScale.bandwidth())
                .transition().delay(function (d,i){ return i * 100;})
                .duration(2000)
                .attr('y', function (d)
                {
                    return yScale(d.value);
                })

                .attr('height', function (d)
                {
                    return drawHeight - yScale(d.value);
                })
                .attr('class', 'bar')
                .attr('fill', function (d)
                {
                    return courtColors[courtTypes[d.key]];
                });
        }

        draw(setData(null, null));
    });
});
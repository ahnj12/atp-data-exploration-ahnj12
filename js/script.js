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

    var svg = d3.select('#viz')
            .attr('width', width)
            .attr('height', height);

    var g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.right + ')')
        .attr('height', height)
        .attr('width', width);

    // Keep these filters as global variables to change with controls
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

    var showResult =
    {
        'w': true,
        'l': true
    };

    var courtType = null;

    // load data
    d3.csv('data/atp_matches_2016.csv', function(error, data) {

        var courtTypes = {};

        // Only grab Masters and Grand Slams
        data = data.filter(function(d)
        {
            return d.tourney_level == 'M' || d.tourney_level == 'G';
        });

        // Label Grand Slams
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
        /************************************** Data prep ***************************************/

        var countData;
        // set up the data based on set/given filters.
        function setData()
        {
            var mastersData = d3.nest().key(function (d)
            {
                return d.tourney_name;
            });

            countData = mastersData.rollup(function (v)
            {
                return d3.sum(v, function(d)
                {
                    var value = 0;
                    if (courtType)
                    {
                        if (courtType != d.surface)
                        {
                            return 0;
                        }
                    }

                    if (showResult['w'])
                    {
                        value += parseInt(d.w_ace);
                    }

                    if (showResult['l'])
                    {
                        value += parseInt(d.l_ace);
                    }

                    if (!roundCheck[d.round])
                    {
                        return 0;
                    }

                    return value;
                })
            }).entries(data);

            // sort from smallest to largest
            return countData.sort(function(a,b)
            {
                if (a.value < b.value) return -1;
                if (a.value > b.value) return 1;
                return 0;
            });
        }

        var xAxisLabel = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + margin.left + ',' + (margin.top + drawHeight) + ')');

        // x axis label not changing
        svg.append('text')
            .text('ATP Tournaments')
            .attr('x', (drawWidth / 2) - 30)
            .attr('y', height - 20);

        var yAxisLabel = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // y axis label not changing
        svg.append('text')
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
            var tournaments = [];

            countData.forEach(function(d)
            {
                if (d.value > 0)
                {
                    tournaments.push(d.key);
                }
            });

            xScale = d3.scaleBand()
                .domain(tournaments)
                .range([0, drawWidth])
                .padding(0.1);

            var maxCount = d3.max(countData, function (d)
                {
                    return +d.value;
                }) * 1.1;

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

        // draws using the given data
        function draw(countData)
        {
            setScales(countData);

            setAxes();

            var bars = g.selectAll('.bar')
                .data(countData);

            bars.enter()
                .append('rect')
                .merge(bars)
                .attr('height', 0)
                .attr('y', drawHeight)
                .attr('x', function (d)
                {
                    return xScale(d.key);
                })
                .attr('width', xScale.bandwidth())
                .transition().delay(function (d,i){ return i * 100;})
                .duration(1000)
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

            bars.exit()
                .transition()
                .attr('height', 0)
                .remove();
        }

        // draw based on initial filters
        draw(setData());

        // surface type control
        $("input[name='surface']").on('change', function()
        {
            var surface = $(this).val();

            if (surface != 'All')
            {
                courtType = surface;
                draw(setData());
            }
            else
            {
                courtType = null;
                draw(setData())
            }
        });

        // Winners/Losers drop down
        $('.show-result').click(function()
        {
            var show = $(this).attr('id');

            switch (show)
            {
                case 'w':
                {
                    $('#show-result').text('Winners');
                    showResult['w'] = true;
                    showResult['l'] = false;
                    break;
                }
                case 'l':
                {
                    $('#show-result').text('Losers');
                    showResult['w'] = false;
                    showResult['l'] = true;
                    break;
                }
                default:
                {
                    $('#show-result').text('Winners & Losers');
                    showResult['w'] = true;
                    showResult['l'] = true;
                }
            }

            draw(setData());
        });

        // list of rounds control
        $('.list-round').click(function ()
        {
            if ($(this).hasClass('active'))
            {
                $(this).removeClass('active');
            }
            else
            {
                $(this).addClass('active');
            }
            $('.list-round').each(function ()
            {
                var input = $(this).find('input[type="hidden"]');
                if ($(this).hasClass('active'))
                {
                    roundCheck[input.val()] = true;
                }
                else
                {
                    roundCheck[input.val()] = false;
                }
            });
            draw(setData());
        });
    });
});
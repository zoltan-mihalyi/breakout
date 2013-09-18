/** The game scene*/
define(['grape', 'scenes/base', 'components/paddle', 'components/ball', 'components/wall', 'components/ground'], function(Grape, Base, Paddle, Ball, Wall, Ground) {
    var l = 'l', h = 'h', v = 'v', g = 'g', r = 'r', b = 'b', t = 't';
    var bg = [
        [l, h, h, h, h, h, h, h, h, h, h, h, h, h, h, h, h, h, h, r],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [v, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, v],
        [b, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, b],
        [g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g],
        [t, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, t],
        [b, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, g, b]
    ];

    return Grape.scene(null, Base, {
        instances: [
            {
                x: 128,
                y: 368,
                type: Paddle
            },
            {
                x: 50,
                y: 208,
                type: Ball
            }
        ],
        init: function() {
            var i, j, row, type;
            for (i = 0; i < bg.length; ++i) {
                row = bg[i];
                for (j = 0; j < row.length; ++j) {
                    type = row[j];
                    if(type!==g){
                        Grape.i(j * 16, i * 16, Wall).sprite = 'wall_' + type;
                    }else{
                        //Grape.i(j * 16, i * 16, Ground);
                    }
                }
            }
        }
    });
});
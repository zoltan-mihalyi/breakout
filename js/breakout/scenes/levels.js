define(['grape', 'scenes/game', 'components/brick'], function(Grape, Game, Brick) {
    var R = 'red', B = 'blue', O = 'orange', G = 'green', X = null;
    var levelSetups = [
        {
            name: "letsa begin",
            bricks: [
                [X, X, G, O, G, X, X],
                [O, B, G, G, G, B, O],
                [X, B, B, B, B, B, X]
            ],
            powerUps: 1,
            powerDowns: 1
        },
        {
            name: "how's it going?",
            bricks: [
                [X, G, O, G, O, G, X],
                [X, B, B, B, B, B, X],
                [G, B, R, B, R, B, G],
                [G, B, B, B, B, B, G],
                [G, B, X, X, X, B, G],
                [X, B, B, B, B, B, X]
            ],
            powerUps: 1,
            powerDowns: 1
        },
        {
            name: 'tie fighta!',
            bricks: [
                [X, B, X, G, X, B, X],
                [B, X, B, O, B, X, B],
                [B, G, B, O, B, G, B],
                [B, X, B, O, B, X, B],
                [X, B, X, X, X, B, X],
                [R, X, R, X, R, X, R]
            ],
            powerUps: 2,
            powerDowns: 2
        },
        {
            name: 'swirl',
            bricks: [
                [R, G, O, B, R, G, O],
                [B, X, X, X, X, X, X],
                [O, X, O, B, R, G, O],
                [G, X, G, X, X, X, B],
                [R, X, R, X, R, X, R],
                [B, X, B, O, G, X, G],
                [O, X, X, X, X, X, O],
                [G, R, B, O, G, R, B]
            ],
            powerUps: 2,
            powerDowns: 3
        }
    ];

    function createLevel(data) {
        return Grape.scene(null, Game, {
            init: function() {
                var i, j, bricks = data.bricks, row, type;
                for (i = 0; i < bricks.length; ++i) {
                    row = bricks[i];
                    for (j = 0; j < row.length; ++j) {
                        type = row[j];
                        if(type!==X){
                            Grape.i(j * 32+48, i * 16+64, Brick).sprite = 'brick_' + type;
                        }
                    }
                }
            }
        });
    }

    var i, levels = [];
    for (i = 0; i < levelSetups.length; ++i) {
        levels[i] = createLevel(levelSetups[i]);
    }

    return levels;
});
define(['grape'], function(Grape) {

    var tiles = Grape.tile(16, 16, 'sprites/tiles.png', {
        brick_red: [0, 0, 5, 2],
        brick_blue: [0, 1, 5, 2],
        brick_orange: [0, 2, 5, 2],
        brick_green: [0, 3, 5, 2],
        paddle: [0, 4, 1, 3],
        paddle_small: [0, 5, 1, 2],
        ball: [3, 4, 5],
        numbers: [0, 6, 3, 2, 3],
        wall_v: [11, 5],
        wall_h: [11, 6],
        wall_l: [11, 4],
        wall_r: [11, 3],
        wall_t: [11, 8],
        wall_b: [11, 7],
        ground: [11, 2]
    });

    tiles.background = Grape.sprite(null, 'sprites/bg_prerendered.png');
    tiles.logo = Grape.sprite(null, 'sprites/logo.png');

    return tiles;
});
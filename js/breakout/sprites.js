define(['grape'], function (Grape) {

    var tiles = Grape.tile(16, 16, 'sprites/tiles.png', {
        brick1:[0, 0, 5, 2],
        brick2:[0, 1, 5, 2],
        brick3:[0, 2, 5, 2],
        brick4:[0, 3, 5, 2],
        paddle:[0, 4, 1, 3],
        paddle_small:[0, 5, 1, 2],
        ball:[3, 4, 5],
        numbers:[0, 6, 3, 2, 3]
    });

    return {
        background:Grape.sprite(null, 'sprites/bg_prerendered.png'),
        logo:Grape.sprite(null, 'sprites/logo.png'),
        paddle:tiles.paddle,
        ball:tiles.ball
    }
});
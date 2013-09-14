/** The game scene*/
define(['grape', 'scenes/base', 'components/paddle', 'components/ball'], function (Grape, Base, Paddle, Ball) {

    return Grape.scene(null, Base, {
        instances:[
            {
                x:128,
                y:368,
                type:Paddle
            },
            {
                x: 50,
                y: 208,
                type: Ball
            }
        ]
    });
});
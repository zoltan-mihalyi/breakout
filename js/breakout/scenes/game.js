/** The game scene*/
define(['grape', 'scenes/base', 'components/paddle'], function (Grape, Base, Paddle) {

    return Grape.scene(null, Base, {
        instances:[
            {
                x:128,
                y:368,
                type:Paddle
            }
        ]
    });
});
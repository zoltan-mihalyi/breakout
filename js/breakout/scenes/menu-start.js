/** The start scene which is derived from the base menu scene. It draws text to the screen and if the user clicks the first game scene is loaded */
define(['grape', 'scenes/menu'], function (Grape, Menu) {
    var verb = Grape.Utils.Environment.mobile ? 'tap' : 'click';
    var MenuStartController = Grape.component('MenuStartController', {
        draw:function () {
            Grape.Draw.text(108, 250, verb + ' to start');
            Grape.Draw.text(10, 310, 'during the game: \nuse L/R arrow keys to skip levels');
        }
    });

    return Grape.scene(null, Menu, {
        instances:[
            {
                x:0,
                y:0,
                type:MenuStartController
            }
        ]
    });
});
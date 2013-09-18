/** The start scene which is derived from the base menu scene. It draws text to the screen and if the user clicks the first game scene is loaded */
define(['grape', 'scenes/menu', 'scenes/game'], function (Grape, Menu, Game) {
    var verb = Grape.Utils.Environment.mobile ? 'tap' : 'click';
    var MenuStartController = Grape.component('MenuStartController', {
        draw:function () {
            Grape.Draw.text(162, 250, verb + ' to start', {align:'center'});
            Grape.Draw.text(162, 310, 'during the game: \nuse L/R arrow keys to skip levels', {align:'center'});
        },

        'keyPress.mouseLeft':function(){
            Grape.startScene(Game);
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
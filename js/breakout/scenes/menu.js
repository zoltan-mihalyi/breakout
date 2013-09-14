/** This module defines a menu scene which can be derived. It contains only a logo and extends the base scene  */
define(['grape', 'scenes/base', 'sprites'], function (Grape, BaseScene, Sprites) {
    var Logo = Grape.component('MenuLogo', 'Sprite,AutoRendered', {
        create:function () {
            this.sprite = Sprites.logo;
        }
    });

    return Grape.scene(null, BaseScene, {
        instances:[
            {
                x:94,
                y:38,
                type:Logo
            }
        ]
    });
});
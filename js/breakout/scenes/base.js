/** This module defines a base for all scenes. It defines the width, height and background properties */
define(['grape', 'sprites'], function (Grape, Sprites) {
    return Grape.scene(null, {
        width:324,
        height:484,
        background:Sprites.background
    });
});
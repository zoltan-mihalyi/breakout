requirejs.config({
    paths:{
        grape:'../lib/grape.min'
    }
});
require(['grape', 'scenes/menu-start'], function (Grape, MenuStart) {
    Grape.start('game-screen', MenuStart);
});
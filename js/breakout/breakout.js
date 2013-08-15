requirejs.config({
    paths:{
        grape:'../lib/grape'
    }
});
require(['grape', 'scenes/menu-start'], function (Grape, MenuStart) {
    Grape.start('game-screen', MenuStart);
    Grape.setCursor('none');
});
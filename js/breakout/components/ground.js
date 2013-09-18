define(['grape', 'sprites'], function(Grape, Sprites) {
    return Grape.component('Ground', 'Sprite,AutoRendered', {
        create: function() {
            this.sprite = Sprites.ground;
        }
    });
});
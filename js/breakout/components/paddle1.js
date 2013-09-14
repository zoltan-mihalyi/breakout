define(['grape', 'sprites'], function (Grape, Sprites) {
    return Grape.component('Paddle', 'Sprite,AutoRendered,Collidable', {
        create:function () {
            this.sprite = Sprites.paddle;
        },

        frame:function () {
            this.x = Grape.Mouse.x - this.getWidth() / 2;
            if (this.x < 0) {
                this.x = 0;
            }
            if (this.x > Grape.playground.width - this.getWidth()) {
                this.x = Grape.playground.width - this.getWidth();
            }
        }
    });
});
define(['grape', 'sprites'], function (Grape, Sprites) {
    return Grape.component('Ball', 'Animated,AutoRendered,Alarm,Collidable,Physical', {
        create:function () {
            this.seconds=3;
            this.imageSpeed = 0.5;
            this.sprite = Sprites.ball;
            this.setAlarm('minus', 1.5 * Grape.playground.fps);
        },

        'alarm.minus':function () {
            this.seconds--;
            if(this.seconds==0){

            }
            this.hspeed = this.vspeed = 5;
        },

        'collision.Collidable':function (other) {
            this.bounceAgainst(other);
        }
    },{

    });
});
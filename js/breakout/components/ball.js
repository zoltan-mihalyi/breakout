define(['grape', 'sprites','components/paddle'], function (Grape, Sprites, Paddle) {
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

        collision:{
            Paddle:function(other){
                var paddleCenter = other.getLeft() + other.getWidth() / 2;
                var center = this.getLeft() + this.getWidth() / 2;
                this.setDirection((paddleCenter-center)/other.getWidth()*160+90);
            },
            Collidable:function (other) {
                this.bounceAgainst(other);
            }
        }
    });
});
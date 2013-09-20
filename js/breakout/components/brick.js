define(['grape','sounds'], function(Grape,Sounds) {
    
    var DisappearingBrick = Grape.component(null, 'Animated, AutoRendered',{
        create:function(){
            this.imageSpeed=0.5;
        },
        animationEnd:function(){
            this.destroy();
        }
    });
    
    return Grape.component('Brick', 'Animated,AutoRendered,Collidable,Alarm', {
        create:function(){
            this.setAlarm('afterStart',1);
        },
        
        animationEnd:function(){
            this.imageSpeed = 0;
            this.subimage=0;
        },
        
        collision:{
            Ball:function(){
                this.disappear();
            }
        },
        'alarm.afterStart':function(){
            this.subimage = this.getSprite().subimages-1;
            this.imageSpeed=-0.2;
        },
        'alarm.destroy':function(){
            this.destroy();
        }
    },{
        disappear:function(){
            Grape.i(this.x, this.y, DisappearingBrick).sprite = this.sprite;
            Grape.playSound(Sounds.brickDeath);
            this.setAlarm('destroy', 1); //if we destroy in this step, the ball moves through it!
        }
    });
});
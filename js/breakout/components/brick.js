define(['grape'], function(Grape) {
    
    var DisappearingBrick = Grape.component(null, 'Animated, AutoRendered',{
        animationEnd:function(){
            this.destroy();
        }
    });
    
    return Grape.component('Brick', 'Animated,AutoRendered,Collidable', {
        create:function(){
            this.sprite='brick1';
            this.subimage = this.getSprite().subimages-1;
            this.imageSpeed=-0.5;
        },
        
        frame:function(){
            console.log(this.subimage);
        },
        
        animationEnd:function(){
            this.imageSpeed = 0;
        },
        
        collision:{
            Ball:function(){
                this.disappear();
            }
        }
    },{
        disappear:function(){
            Grape.i(this.x, this.y, DisappearingBrick).sprite = this.sprite;
            Grape.playSound(Sounds.brickDeath);
            this.destroy();
        }
    });
});
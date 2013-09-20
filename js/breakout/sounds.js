define(['grape'], function(Grape) {
    var i, sounds = ['brickDeath', 'countdownBlip', 'powerdown', 'powerup', 'recover'], result = {}, name;

    for (i = 0; i < sounds.length; ++i) {
        name = sounds[i];
        result[name] = Grape.sound(null, 'sounds/' + name + '.mp3', 'sounds/' + name + '.ogg', 'sounds/' + name + '.wav');
    }
    
    return result;
});
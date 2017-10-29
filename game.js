var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-game', { preload: preload, create: create, update: update, render: render });

function preload () {

    //game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    //game.load.image('bullet', 'assets/bullet.png');
    //game.load.image('earth', 'assets/scorched_earth.png');
    game.load.baseURL = 'http://examples.phaser.io/';
    game.load.crossOrigin = 'anonymous';

    
    game.load.atlas('tank', 'assets/games/tanks/tanks.png', 'assets/games/tanks/tanks.json');
    game.load.image('bullet', 'assets/games/tanks/bullet.png');
    game.load.image('earth', 'assets/games/tanks/scorched_earth.png');    
}

var land;

//var shadow;
var tank;
var turret;

var cursors;

var bullets;
var fireRate = 300;
var nextFire = 0;

function create () {
    
    //prevent game stopping when focus is lost
    game.stage.disableVisibilityChange = true;
    
    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 800, 600, 'earth');
    land.fixedToCamera = true;

//
    tank=game.add.sprite(0,0)//, 'tank', 'tank1')
    tank.texture.baseTexture.skipRender = false
//
    cameraFocus = game.add.sprite(0,0);


    //  The base of our tank
    tank = game.add.sprite(0, 0, 'tank', 'tank1');
    tank.anchor.setTo(0.5, 0.5);
    tank.animations.add('move', ['tank1', 'tank2', 'tank3', 'tank4', 'tank5', 'tank6'], 20, true);

    //  This will force it to decelerate and limit its speed
    game.physics.enable(tank, Phaser.Physics.ARCADE);
    //tank.body.maxVelocity.setTo(200, 200);
    tank.body.collideWorldBounds = true;

    //  Finally the turret that we place on-top of the tank body
    turret = game.add.sprite(0, 0, 'tank', 'turret');
    turret.anchor.setTo(0.3, 0.5);

    //  A shadow below our tank
    //shadow = game.add.sprite(0, 0, 'tank', 'shadow');
    //shadow.anchor.setTo(0.5, 0.5);
    tank.vel = 0;
    tank.maxVel = 300;
    //tank.addChild(shadow);
    tank.addChild(turret);
    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    tank.bringToTop();
    turret.bringToTop();

    game.camera.follow(cameraFocus);
    //game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    //game.camera.focusOnXY(100, 100);
    game.camera.roundPX = true;

    //cursors = game.input.keyboard.createCursorKeys();
    cursors = game.input.keyboard.addKeys({ 'w': Phaser.KeyCode.W, 's': Phaser.KeyCode.S, 'a': Phaser.KeyCode.A, 'd': Phaser.KeyCode.D, 'up': Phaser.KeyCode.UP, 'down': Phaser.KeyCode.DOWN, 'left': Phaser.KeyCode.LEFT, 'right': Phaser.KeyCode.RIGHT });

}

function update () {

    game.physics.arcade.overlap(tank, null, this);

    if (cursors.right.isDown || cursors.d.isDown)
        tank.body.angularVelocity = 200;

    else if (cursors.left.isDown || cursors.a.isDown)
        tank.body.angularVelocity = -200;
    else
        tank.body.angularVelocity = 0;
       
    
    if (cursors.up.isDown || cursors.w.isDown) {
        tank.vel += (tank.maxVel - tank.vel) / 20.0;
    }
    else if (cursors.down.isDown || cursors.s.isDown) {
        tank.vel += (-tank.maxVel - tank.vel) / 15.0;
    }
    else if (tank.vel > 0)
    {
        tank.vel -= 10;
        if (tank.vel < 0) tank.vel = 0;
    }
    else if (tank.vel < 0) {
        tank.vel += 10;
        if (tank.vel > 0) tank.vel = 0;
    }
    console.log(tank.vel);
        game.physics.arcade.velocityFromAngle(tank.angle, tank.vel, tank.body.velocity);
    //cameraFocus.x = (tank.body.x + game.camera.x) / 2.0;
    //cameraFocus.y = (tank.body.y + game.camera.y) / 2.0;

    cameraFocus.x = (tank.x - tank.anchor.x + 0.5*game.width*(game.input.x/game.width - 0.5));
    cameraFocus.y = (tank.y - tank.anchor.y + 0.5*game.height*(game.input.y/game.height - 0.5));
    //console.log(tank.body.x + " " + tank.body.y + " " + game.input.x + " " + game.input.y);
    //console.log(game.width + " " + game.height + " " + game.input.x + " " + game.input.y);

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    //turret.x = tank.x;
    //turret.y = tank.y;

    turret.rotation = game.physics.arcade.angleToPointer(tank) - tank.rotation;

    if (game.input.activePointer.isDown)
    {
        fire();
    }

}

function fire () {

    if (game.time.now > nextFire && bullets.countDead() > 0)
    {
        //nextFire = game.time.now + fireRate;

        //var bullet = bullets.getFirstExists(false);

        //bullet.reset(tank.x, tank.y);

        //bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer, 500);
        nextFire = game.time.now + fireRate;

        var bullet = bullets.getFirstExists(false);
        
        var theta = turret.angle + tank.angle
        var p = new Phaser.Point(turret.world.x, turret.world.y)
        p.rotate(turret.world.x, turret.world.y, theta, true,60) // 60 is distance from centre ...looks like coming out of turret not under tank
        
        // work out the angle from the centre
        bullet.reset(turret.world.x,turret.world.y);
        var rotation = game.physics.arcade.angleToPointer(bullet)
     
        // move it to our rotated & shifted point
        bullet.position.set(p.x, p.y)
        bullet.rotation=rotation
        // fire!
        game.physics.arcade.velocityFromRotation(rotation, 200, bullet.body.velocity)//200 = speed of bullet
}

}

function render () {

    // game.debug.text('Active Bullets: ' + bullets.countLiving() + ' / ' + bullets.length, 32, 32);

}
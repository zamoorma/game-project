var socket;
socket = io.connect();

canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_height = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(canvas_width-20, canvas_height-20, Phaser.CANVAS, 'gameDiv', { preload: preload, create: create, update: update, render: render });

var enemies = [];

var gameProperties = {
    gameWidth: 4000,
    gameHeight: 4000,
    game_element: "gameDiv",
    in_game: false,
};

function onsocketconnected(){
    console.log("connected to server");
    createPlayer();
    gameProperties.in_game = true;
    socket.emit('new_player', {x: 0, y:0, angle:0});
}

function onRemovePlayer(data){
    var removePlayer = findplayerbyid(data.id);
    if (!removePlayer){
        console.log('Player not found: ', data.id)
        return;
    }
    removePlayer.player.destroy();
    enemies.splice(enemies.indexOf(removePlayer), 1);
}

function createPlayer(){
    player = game.add.graphics(0, 0);
	player.radius = 100;

	// set a fill and line style
	player.beginFill(0xffd900);
	player.lineStyle(2, 0xffd900, 1);
	player.drawCircle(0, 0, player.radius * 2);
	player.endFill();
	player.anchor.setTo(0.5,0.5);
	player.body_size = player.radius; 

	// draw a shape
	game.physics.p2.enableBody(player, true);
	player.body.clearShapes();
	player.body.addCircle(player.body_size, 0 , 0); 
	player.body.data.shapes[0].sensor = true;
}

var remote_player = function(id, startx, stary, start_angle){
    this.x = startx;
    this.y = starty;
    this.id = id;
    this.angle = start_angle;
    
    this.player = game.add.graphics(this.x, this.y);
    this.player.radius = 100;
    
    this.player.beginFill(0xffd900);
	this.player.lineStyle(2, 0xffd900, 1);
	this.player.drawCircle(0, 0, this.player.radius * 2);
	this.player.endFill();
	this.player.anchor.setTo(0.5,0.5);
	this.player.body_size = this.player.radius; 

	// draw a shape
	game.physics.p2.enableBody(this.player, true);
	this.player.body.clearShapes();
	this.player.body.addCircle(this.player.body_size, 0 , 0); 
	this.player.body.data.shapes[0].sensor = true;
}

function onNewPlayer (data) {
	console.log(data);
	//enemy object 
	var new_enemy = new remote_player(data.id, data.x, data.y, data.angle); 
	enemies.push(new_enemy);
}

function onEnemyMove (data) {
	console.log(data.id);
	console.log(enemies);
	var movePlayer = findplayerbyid (data.id); 
	
	if (!movePlayer) {
		return;
	}
	movePlayer.player.body.x = data.x; 
	movePlayer.player.body.y = data.y; 
	movePlayer.player.angle = data.angle; 
}

function findplayerbyid (id) {
	for (var i = 0; i < enemies.length; i++) {
		if (enemies[i].id == id) {
			return enemies[i]; 
		}
	}
}

function preload () {
    //prevent game stopping when focus is lost
    game.stage.disableVisibilityChange = true;
    game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
    game.world.setBounds(-1000, -1000, 2000, 2000);
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.setBoundsToWorld(false, false, false, false, false)
	game.physics.p2.gravity.y = 0;
	game.physics.p2.applyGravity = false; 
	game.physics.p2.enableBody(game.physics.p2.walls, false);
    
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
var player;
var turret;

var cursors;

var bullets;
var fireRate = 300;
var nextFire = 0;

function create () {
    game.stage.backgroundColor = 0xE1A193;;

    console.log("client started");
    socket.on("connect", onsocketconnected);
    socket.on("new_enemyPlayer", onNewPlayer);
    socket.on("enemy_move", onEnemyMove);
    socket.on("remove_player", onRemovePlayer);
    
    
    //  Our tiled scrolling background
   // land = game.add.tileSprite(0, 0, canvas_width, canvas_height, 'earth');
    //land.fixedToCamera = true;

    //  The base of our tank
    player = game.add.sprite(0, 0, 'tank', 'tank1');
    player.anchor.setTo(0.5, 0.5);
    player.animations.add('move', ['tank1', 'tank2', 'tank3', 'tank4', 'tank5', 'tank6'], 20, true);

    //  This will force it to decelerate and limit its speed
    /*game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.drag.set(0.2);
    player.body.maxVelocity.setTo(200, 200);
    player.body.collideWorldBounds = true;
*/
    //  Finally the turret that we place on-top of the tank body
    turret = game.add.sprite(0, 0, 'tank', 'turret');
    turret.anchor.setTo(0.3, 0.5);

    //  A shadow below our tank
    //shadow = game.add.sprite(0, 0, 'tank', 'shadow');
    //shadow.anchor.setTo(0.5, 0.5);

    //tank.addChild(shadow);
    player.addChild(turret);
    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    player.bringToTop();
    turret.bringToTop();

    game.camera.follow(player);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

}

function update () {

    game.physics.arcade.overlap(player, null, this);

    if (cursors.right.isDown)
        player.body.velocity.x += 5;

    else if (cursors.left.isDown)
        player.body.velocity.x -= 5;

    else if (player.body.velocity.x > 0)
        player.body.velocity.x -= 1;

    else if (player.body.velocity.x < 0)
        player.body.velocity.x += 1;

    if (cursors.up.isDown)
        player.body.velocity.y -= 5;

    else if (cursors.down.isDown)
        player.body.velocity.y += 5;

    else if (player.body.velocity.y > 0)
        player.body.velocity.y -= 1;

    else if (player.body.velocity.y < 0)
        player.body.velocity.y += 1;

    //land.tilePosition.x = -game.camera.x;
    //land.tilePosition.y = -game.camera.y;

    //turret.x = tank.x;
    //turret.y = tank.y;

    turret.rotation = game.physics.arcade.angleToPointer(player);

    if (game.input.activePointer.isDown)
    {
        fire();
    }
    socket.emit('move_player', {x: player.x, y: player.y, angle: player.angle});

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
        
        var theta = turret.angle + player.angle
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